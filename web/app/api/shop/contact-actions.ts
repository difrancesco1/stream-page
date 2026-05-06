"use server";

import { API_URL } from "@/lib/api";

export type ContactResult =
  | { success: true }
  | { success: false; error: string };

export async function submitContactForm(data: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactResult> {
  try {
    const response = await fetch(`${API_URL}/shop/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error =
        body.detail || body.message || `Server error: ${response.status}`;
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
