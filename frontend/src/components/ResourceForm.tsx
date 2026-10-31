import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { ApiError } from "../api/client";

export type FieldType = "text" | "email" | "password" | "tel" | "number" | "date" | "textarea" | "select" | "checkbox";

export interface Field {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  validate?: (value: any, all: Record<string, any>) => string | true;
}

interface Props {
  fields: Field[];
  submitLabel: string;
  onSubmit: (values: Record<string, any>) => Promise<unknown>;
  defaultValues?: Record<string, any>;
  onSuccess?: () => void;
  successMessage?: string;
  resetOnSuccess?: boolean;
}

const input = "w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none";

// DRF error bodies: {field: [msg]}, {detail: msg}, or nested {profile: {field: [msg]}} -> flat {field: msg}
function flatten(body: unknown, out: Record<string, string> = {}): Record<string, string> {
  if (body && typeof body === "object") {
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.map(String).join(" ");
      else if (typeof v === "string") out[k] = v;
      else flatten(v, out);
    }
  }
  return out;
}

export default function ResourceForm({ fields, submitLabel, onSubmit, defaultValues, onSuccess, successMessage, resetOnSuccess }: Props) {
  const { register, handleSubmit, setError, reset, getValues, formState } = useForm<Record<string, any>>({ defaultValues });
  const { errors, isSubmitting } = formState;
  const [done, setDone] = useState(false);

  const submit = handleSubmit(async (values) => {
    setDone(false);
    try {
      await onSubmit(values);
      setDone(true);
      if (resetOnSuccess) reset(defaultValues);
      onSuccess?.();
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === "object") {
        const flat = flatten(e.body);
        let placed = false;
        for (const [k, msg] of Object.entries(flat)) {
          if (fields.some((f) => f.name === k)) { setError(k, { message: msg }); placed = true; }
        }
        const rest = Object.entries(flat).filter(([k]) => !fields.some((f) => f.name === k)).map(([, m]) => m);
        if (rest.length || !placed) setError("root.server", { message: rest.join(" ") || `Request failed (${e.status})` });
      } else {
        setError("root.server", { message: "Network error. Please try again." });
      }
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {errors.root?.server && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.server.message}</p>}
      {done && successMessage && <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">{successMessage}</p>}
      {fields.map((f) => {
        const rules = {
          required: f.required && f.type !== "checkbox" ? `${f.label} is required.` : false,
          validate: f.validate ? (v: any) => f.validate!(v, getValues()) : undefined,
        };
        const err = errors[f.name]?.message as string | undefined;
        const id = `f-${f.name}`;
        let control: ReactNode;
        if (f.type === "textarea") control = <textarea id={id} rows={3} className={input} {...register(f.name, rules)} />;
        else if (f.type === "select")
          control = (
            <select id={id} className={input} {...register(f.name, rules)}>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          );
        else if (f.type === "checkbox") control = <input id={id} type="checkbox" className="mr-2" {...register(f.name)} />;
        else control = <input id={id} type={f.type ?? "text"} placeholder={f.placeholder} autoComplete={f.autoComplete} className={input} {...register(f.name, rules)} />;

        return (
          <div key={f.name}>
            {f.type === "checkbox" ? (
              <label htmlFor={id} className="flex items-start text-sm">{control}<span>{f.label}</span></label>
            ) : (
              <>
                <label htmlFor={id} className="mb-1 block text-sm font-medium">{f.label}{f.required && " *"}</label>
                {control}
              </>
            )}
            {f.hint && !err && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
            {err && <p role="alert" className="mt-1 text-sm text-red-700">{err}</p>}
          </div>
        );
      })}
      <button type="submit" disabled={isSubmitting} className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {isSubmitting ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
