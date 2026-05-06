"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { submitContactForm } from "@/app/api/shop/contact-actions";
import CardHeader from "../shared/card-header";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email"),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const defaultValues: ContactFormValues = {
  name: "",
  email: "",
  message: "",
};

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "form" | "sending" | "success";

export default function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema as never) as Resolver<ContactFormValues>,
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  useEffect(() => {
    if (open) {
      setStep("form");
      setError(null);
      reset(defaultValues);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setStep("sending");
    const result = await submitContactForm(values);
    if (!result.success) {
      setError(result.error);
      setStep("form");
      return;
    }
    setStep("success");
  });

  const inputClass =
    "p-[var(--spacing-sm)] pixel-borders bg-background main-text text-xs";
  const fieldErrorClass = "main-text text-[10px] text-red-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="pixel-borders pixel-card bg-foreground border-[length:var(--border-width)] border-border max-h-[90vh] overflow-y-auto p-[var(--spacing-md)] max-w-[26rem]"
      >
        <CardHeader title="contact me" exitbtn={true} showTabs={false}>
          <DialogTitle className="sr-only">Contact form</DialogTitle>

          {step === "form" && (
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-[var(--spacing-sm)]"
            >
              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">Name</label>
                <input
                  type="text"
                  autoComplete="name"
                  className={inputClass}
                  {...register("name")}
                />
                {errors.name && (
                  <p className={fieldErrorClass}>{errors.name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  {...register("email")}
                />
                {errors.email && (
                  <p className={fieldErrorClass}>{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-[var(--spacing-xs)]">
                <label className="main-text text-xs">Message</label>
                <textarea
                  rows={4}
                  className={`${inputClass} resize-none`}
                  {...register("message")}
                />
                {errors.message && (
                  <p className={fieldErrorClass}>{errors.message.message}</p>
                )}
              </div>

              <div className="flex justify-end pt-[var(--spacing-sm)]">
                <button
                  type="submit"
                  className="pixel-borders pixel-btn-border px-[var(--spacing-md)]"
                >
                  send
                </button>
              </div>

              {error && (
                <p className="main-text text-xs text-red-400">{error}</p>
              )}
            </form>
          )}

          {step === "sending" && (
            <div className="flex items-center justify-center py-8">
              <span className="main-text text-xs opacity-70">sending...</span>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col gap-[var(--spacing-md)]">
              <p className="main-text text-sm">Message sent!</p>
              <p className="main-text text-xs opacity-70">
                Thanks for reaching out. I&apos;ll get back to you soon.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="pixel-borders pixel-btn-border px-[var(--spacing-md)]"
                >
                  done
                </button>
              </div>
            </div>
          )}
        </CardHeader>
      </DialogContent>
    </Dialog>
  );
}
