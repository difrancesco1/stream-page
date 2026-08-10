interface SuccessStepProps {
  isAdmin: boolean;
  successEmail: string | null;
  successOrderId: string | null;
  onDone: () => void;
}

export default function SuccessStep({
  isAdmin,
  successEmail,
  successOrderId,
  onDone,
}: SuccessStepProps) {
  return (
    <div className="flex flex-col gap-[var(--spacing-md)]">
      <p className="main-text text-sm">
        {isAdmin ? "Custom order recorded" : "Payment successful"}
      </p>
      {successEmail && (
        <p className="main-text text-xs opacity-70">
          {isAdmin
            ? `Receipt sent to ${successEmail}.`
            : `We sent a confirmation to ${successEmail}.`}
        </p>
      )}
      {successOrderId && (
        <p className="main-text text-xs opacity-70">
          Order id: {successOrderId}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="pixel-borders pixel-btn-border px-[var(--spacing-md)]"
        >
          done
        </button>
      </div>
    </div>
  );
}
