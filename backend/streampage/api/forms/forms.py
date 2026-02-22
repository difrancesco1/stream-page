import logging
import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from streampage.api.middleware.authenticator import (
    get_current_user,
    require_creator,
)
from streampage.api.forms.models import (
    ResponseMessage,
    FormCreate,
    FormUpdate,
    FormSummaryResponse,
    FormDetailResponse,
    FormListResponse,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    ReorderQuestionsRequest,
    FormResponseSubmit,
    FormResponsesListResponse,
    SingleResponseDetail,
    AnswerResponse,
)
from streampage.db.engine import get_db_session
from streampage.db.enums import QuestionType
from streampage.db.models import (
    Form,
    FormQuestion,
    FormResponse,
    FormAnswer,
    User,
)
from streampage.services.storage import storage_service

logger = logging.getLogger(__name__)

forms_router = APIRouter()

ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".doc", ".docx",
}


# ── Helpers ──────────────────────────────────────────────────────────────


def _form_to_detail_response(form: Form) -> FormDetailResponse:
    questions = [
        QuestionResponse(
            id=str(q.id),
            question_text=q.question_text,
            question_type=q.question_type.value,
            options=q.options,
            is_required=q.is_required,
            display_order=q.display_order,
        )
        for q in form.questions
    ]
    return FormDetailResponse(
        id=str(form.id),
        title=form.title,
        description=form.description,
        is_open=form.is_open,
        email_notifications_enabled=form.email_notifications_enabled,
        questions=questions,
        response_count=len(form.responses),
        created_at=form.created_at,
        updated_at=form.updated_at,
    )


def _parse_uuid(value: str, label: str = "ID") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {label} format")


def _cleanup_form_file_uploads(session, form: Form):
    """Delete Supabase files for any file-upload answers in this form."""
    file_question_ids = {
        q.id for q in form.questions if q.question_type == QuestionType.FILE_UPLOAD
    }
    if not file_question_ids:
        return
    for resp in form.responses:
        for ans in resp.answers:
            if ans.question_id in file_question_ids and ans.answer_value:
                url = ans.answer_value if isinstance(ans.answer_value, str) else str(ans.answer_value)
                if "supabase.co" in url:
                    storage_service.delete_image(url)


def _validate_answer(value, question: FormQuestion) -> list[str]:
    """Validate a single answer value against its question type.

    Returns a list of error strings (empty if valid).
    """
    qtype = question.question_type
    errors: list[str] = []
    label = f"Question '{question.question_text}'"

    if value is None:
        return errors  # None is handled by the required-field check

    if qtype == QuestionType.SHORT_TEXT:
        if not isinstance(value, str):
            errors.append(f"{label}: expected a text string")
        elif len(value) > 500:
            errors.append(f"{label}: answer exceeds 500 characters")

    elif qtype == QuestionType.LONG_TEXT:
        if not isinstance(value, str):
            errors.append(f"{label}: expected a text string")
        elif len(value) > 5000:
            errors.append(f"{label}: answer exceeds 5000 characters")

    elif qtype in (QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN):
        if not isinstance(value, str):
            errors.append(f"{label}: expected a single choice string")
        elif question.options and "choices" in question.options:
            if value not in question.options["choices"]:
                errors.append(f"{label}: '{value}' is not a valid choice")

    elif qtype == QuestionType.CHECKBOXES:
        if not isinstance(value, list):
            errors.append(f"{label}: expected a list of selected choices")
        elif question.options and "choices" in question.options:
            valid = set(question.options["choices"])
            invalid = [v for v in value if v not in valid]
            if invalid:
                errors.append(f"{label}: invalid choice(s): {', '.join(str(v) for v in invalid)}")

    elif qtype == QuestionType.RATING:
        if not isinstance(value, (int, float)):
            errors.append(f"{label}: expected a number")
        elif question.options:
            min_val = question.options.get("min", 1)
            max_val = question.options.get("max", 5)
            if not (min_val <= value <= max_val):
                errors.append(f"{label}: rating must be between {min_val} and {max_val}")

    elif qtype == QuestionType.DATE:
        if not isinstance(value, str):
            errors.append(f"{label}: expected a date string (YYYY-MM-DD)")
        else:
            try:
                date.fromisoformat(value)
            except ValueError:
                errors.append(f"{label}: invalid date format, expected YYYY-MM-DD")

    elif qtype == QuestionType.FILE_UPLOAD:
        if not isinstance(value, str):
            errors.append(f"{label}: expected a file URL string")

    return errors


# ── Form CRUD (creator only) ────────────────────────────────────────────


@forms_router.post("")
def create_form(
    request: FormCreate,
    user: User = Depends(require_creator),
) -> FormDetailResponse:
    with get_db_session() as session:
        form = Form(
            creator_id=user.id,
            title=request.title,
            description=request.description,
            is_open=request.is_open,
            email_notifications_enabled=request.email_notifications_enabled,
        )
        session.add(form)
        session.flush()

        for idx, q in enumerate(request.questions):
            question = FormQuestion(
                form_id=form.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options,
                is_required=q.is_required,
                display_order=q.display_order if q.display_order else idx,
            )
            session.add(question)

        session.commit()

        form = session.query(Form).filter(Form.id == form.id).first()
        return _form_to_detail_response(form)


@forms_router.get("/list")
def list_forms(
    user: User = Depends(require_creator),
) -> FormListResponse:
    with get_db_session() as session:
        forms = (
            session.query(Form)
            .filter(Form.creator_id == user.id)
            .order_by(Form.created_at.desc())
            .all()
        )
        summaries = [
            FormSummaryResponse(
                id=str(f.id),
                title=f.title,
                description=f.description,
                is_open=f.is_open,
                email_notifications_enabled=f.email_notifications_enabled,
                response_count=len(f.responses),
                created_at=f.created_at,
                updated_at=f.updated_at,
            )
            for f in forms
        ]
        return FormListResponse(forms=summaries)


@forms_router.patch("/{form_id}")
def update_form(
    form_id: str,
    request: FormUpdate,
    user: User = Depends(require_creator),
) -> FormDetailResponse:
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")

        if request.title is not None:
            form.title = request.title
        if request.description is not None:
            form.description = request.description
        if request.is_open is not None:
            form.is_open = request.is_open
        if request.email_notifications_enabled is not None:
            form.email_notifications_enabled = request.email_notifications_enabled

        session.commit()

        form = session.query(Form).filter(Form.id == form_uuid).first()
        return _form_to_detail_response(form)


@forms_router.delete("/{form_id}")
def delete_form(
    form_id: str,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")

        _cleanup_form_file_uploads(session, form)
        session.delete(form)
        session.commit()

        return ResponseMessage(message="Successfully deleted form")


# ── Question management (creator only) ──────────────────────────────────


@forms_router.post("/{form_id}/questions")
def add_question(
    form_id: str,
    request: QuestionCreate,
    user: User = Depends(require_creator),
) -> QuestionResponse:
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")

        max_order = (
            session.query(FormQuestion)
            .filter(FormQuestion.form_id == form_uuid)
            .count()
        )

        question = FormQuestion(
            form_id=form_uuid,
            question_text=request.question_text,
            question_type=request.question_type,
            options=request.options,
            is_required=request.is_required,
            display_order=request.display_order if request.display_order else max_order,
        )
        session.add(question)
        session.commit()

        return QuestionResponse(
            id=str(question.id),
            question_text=question.question_text,
            question_type=question.question_type.value,
            options=question.options,
            is_required=question.is_required,
            display_order=question.display_order,
        )


@forms_router.patch("/{form_id}/questions/reorder")
def reorder_questions(
    form_id: str,
    request: ReorderQuestionsRequest,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")

        for index, qid in enumerate(request.question_ids):
            question_uuid = _parse_uuid(qid, "question ID")
            question = (
                session.query(FormQuestion)
                .filter(
                    FormQuestion.id == question_uuid,
                    FormQuestion.form_id == form_uuid,
                )
                .first()
            )
            if question:
                question.display_order = index

        session.commit()
        return ResponseMessage(message="Successfully reordered questions")


@forms_router.patch("/{form_id}/questions/{question_id}")
def update_question(
    form_id: str,
    question_id: str,
    request: QuestionUpdate,
    user: User = Depends(require_creator),
) -> QuestionResponse:
    form_uuid = _parse_uuid(form_id, "form ID")
    question_uuid = _parse_uuid(question_id, "question ID")
    with get_db_session() as session:
        question = (
            session.query(FormQuestion)
            .filter(
                FormQuestion.id == question_uuid,
                FormQuestion.form_id == form_uuid,
            )
            .first()
        )
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        if request.question_text is not None:
            question.question_text = request.question_text
        if request.question_type is not None:
            question.question_type = request.question_type
        if request.options is not None:
            question.options = request.options
        if request.is_required is not None:
            question.is_required = request.is_required
        if request.display_order is not None:
            question.display_order = request.display_order

        session.commit()

        return QuestionResponse(
            id=str(question.id),
            question_text=question.question_text,
            question_type=question.question_type.value,
            options=question.options,
            is_required=question.is_required,
            display_order=question.display_order,
        )


@forms_router.delete("/{form_id}/questions/{question_id}")
def delete_question(
    form_id: str,
    question_id: str,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    form_uuid = _parse_uuid(form_id, "form ID")
    question_uuid = _parse_uuid(question_id, "question ID")
    with get_db_session() as session:
        question = (
            session.query(FormQuestion)
            .filter(
                FormQuestion.id == question_uuid,
                FormQuestion.form_id == form_uuid,
            )
            .first()
        )
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        session.delete(question)
        session.commit()

        return ResponseMessage(message="Successfully deleted question")


# ── Responses (creator views, users submit) ─────────────────────────────


@forms_router.get("/{form_id}/responses")
def get_form_responses(
    form_id: str,
    user: User = Depends(require_creator),
) -> FormResponsesListResponse:
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")

        # Question lookup
        question_map = {q.id: q for q in form.questions}

        # Query 1: all responses for this form
        responses = (
            session.query(FormResponse)
            .filter(FormResponse.form_id == form_uuid)
            .order_by(FormResponse.submitted_at.desc())
            .all()
        )

        if not responses:
            return FormResponsesListResponse(
                form_id=str(form.id),
                form_title=form.title,
                responses=[],
            )

        response_ids = [r.id for r in responses]
        respondent_ids = [r.respondent_id for r in responses]

        # Query 2: all respondent users in one shot
        respondents = (
            session.query(User)
            .filter(User.id.in_(respondent_ids))
            .all()
        )
        respondent_map = {u.id: u for u in respondents}

        # Query 3: all answers across all responses in one shot
        all_answers = (
            session.query(FormAnswer)
            .filter(FormAnswer.response_id.in_(response_ids))
            .all()
        )
        # Group answers by response_id
        answers_by_response: dict[uuid.UUID, list[FormAnswer]] = {}
        for ans in all_answers:
            answers_by_response.setdefault(ans.response_id, []).append(ans)

        # Assemble output
        responses_out = []
        for resp in responses:
            respondent = respondent_map.get(resp.respondent_id)
            answers_out = []
            for ans in answers_by_response.get(resp.id, []):
                q = question_map.get(ans.question_id)
                answers_out.append(AnswerResponse(
                    question_id=str(ans.question_id),
                    question_text=q.question_text if q else "[deleted question]",
                    question_type=q.question_type.value if q else "unknown",
                    answer_value=ans.answer_value,
                ))
            responses_out.append(SingleResponseDetail(
                id=str(resp.id),
                respondent_username=respondent.username if respondent else "unknown",
                submitted_at=resp.submitted_at,
                answers=answers_out,
            ))

        return FormResponsesListResponse(
            form_id=str(form.id),
            form_title=form.title,
            responses=responses_out,
        )


# ── Public-facing (authenticated users) ─────────────────────────────────


@forms_router.get("/{form_id}")
def get_form(
    form_id: str,
    user: User = Depends(get_current_user),
) -> FormDetailResponse:
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")

        is_creator = user.username.lower() == "rosie"
        if not is_creator and not form.is_open:
            raise HTTPException(
                status_code=403,
                detail="This form is not currently accepting responses",
            )

        return _form_to_detail_response(form)


@forms_router.post("/{form_id}/respond")
def submit_response(
    form_id: str,
    request: FormResponseSubmit,
    user: User = Depends(get_current_user),
) -> ResponseMessage:
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")

        if not form.is_open:
            raise HTTPException(
                status_code=403,
                detail="This form is not currently accepting responses",
            )

        # Check for duplicate submission
        existing = (
            session.query(FormResponse)
            .filter(
                FormResponse.form_id == form_uuid,
                FormResponse.respondent_id == user.id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail="You have already submitted a response to this form",
            )

        # Build question lookup
        question_map = {str(q.id): q for q in form.questions}

        # Validate required questions are answered
        required_question_ids = {
            qid for qid, q in question_map.items() if q.is_required
        }
        answered_question_ids = {
            a.question_id for a in request.answers if a.answer_value is not None
        }
        missing = required_question_ids - answered_question_ids
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required answers for question(s): {', '.join(missing)}",
            )

        # Validate question ownership and answer values
        all_errors: list[str] = []
        for ans in request.answers:
            question = question_map.get(ans.question_id)
            if not question:
                raise HTTPException(
                    status_code=400,
                    detail=f"Question {ans.question_id} does not belong to this form",
                )
            if ans.answer_value is not None:
                all_errors.extend(_validate_answer(ans.answer_value, question))

        if all_errors:
            raise HTTPException(status_code=400, detail="; ".join(all_errors))

        form_response = FormResponse(
            form_id=form_uuid,
            respondent_id=user.id,
        )
        session.add(form_response)
        session.flush()

        for ans in request.answers:
            answer = FormAnswer(
                response_id=form_response.id,
                question_id=uuid.UUID(ans.question_id),
                answer_value=ans.answer_value,
            )
            session.add(answer)

        session.commit()

        # Send email notification if the creator opted in for this form
        if form.email_notifications_enabled:
            creator = session.query(User).filter(User.id == form.creator_id).first()
            if creator and creator.email:
                from streampage.services.email import send_form_response_email
                send_form_response_email(
                    to_email=creator.email,
                    form_title=form.title,
                    respondent_username=user.username,
                )

        return ResponseMessage(message="Response submitted successfully")


@forms_router.post("/{form_id}/upload")
async def upload_form_file(
    form_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> ResponseMessage:
    """Upload a file for a file-upload question. Returns the public URL."""
    form_uuid = _parse_uuid(form_id, "form ID")
    with get_db_session() as session:
        form = session.query(Form).filter(Form.id == form_uuid).first()
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if not form.is_open:
            raise HTTPException(status_code=403, detail="Form is closed")

    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))}",
        )

    contents = await file.read()
    public_url = storage_service.upload_image(contents, "forms", file_ext)

    return ResponseMessage(message=public_url)
