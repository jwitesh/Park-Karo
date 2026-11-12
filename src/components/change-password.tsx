"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/(app)/profile/actions";
import { Field, Msg, Submit, inputCls } from "@/components/admin-ui";

export default function ChangePassword() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="space-y-2">
      <Field label="Current password">
        <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
      </Field>
      <Field label="New password (min 8 characters)">
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </Field>
      <Field label="Confirm new password">
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>Change password</Submit>
        <Msg s={state} />
      </div>
    </form>
  );
}
