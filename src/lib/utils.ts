export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | number | string | null | undefined }
  | ClassValue[];

/**
 * Class name concatenation and conditional class utility
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "object") {
      if (Array.isArray(input)) {
        classes.push(cn(...input));
      } else {
        for (const key in input) {
          if (input[key]) {
            classes.push(key);
          }
        }
      }
    }
  }

  return classes.join(" ");
}
