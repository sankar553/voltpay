import type { FormEvent } from "react";

/**
 * Submit handler that reads the form but does NOT let React 19 reset it afterwards
 * (`<form action={fn}>` clears every field when the action finishes, which wipes the user's
 * input whenever the server answers with a validation error).
 */
export function onSubmitWith(fn: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fn(new FormData(e.currentTarget));
  };
}
