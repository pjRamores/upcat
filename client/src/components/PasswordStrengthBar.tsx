import type {PasswordStrength} from "@upcat/shared";
import {validatePassword} from "@upcat/shared";

const colorMap: Record<PasswordStrength, string> = {
  weak: "bg-amber-500",
  medium: "bg-amber-500",
  strong: "bg-green-500",
};

const labelMap: Record<PasswordStrength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const widthMap: Record<PasswordStrength, string> = {
  weak: "w-1/3",
  medium: "w-2/3",
  strong: "w-full",
};

export default function PasswordStrengthBar({password}: {password: string}) {
  if (!password) return null;

  const {strength, errors} = validatePassword(password);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${widthMap[strength]} ${colorMap[strength]}`}
          />
        </div>
      </div>
      <span
        className={`text-xs font-medium ${
          strength === "weak"
          ? "text-amber-600"
          : strength === "medium"
          ? "text-amber-600"
          : "text-green-600"
        }`}
      >
        {labelMap[strength]}
      </span>
    </div>
    {errors.length > 0 && (
      <ul className="space-y-0.5">
        {errors.map((err) => (
          <li key={err} className="text-xs text-amber-500">
            {err}
          </li>
        ))}
      </ul>
    )}
  );
}