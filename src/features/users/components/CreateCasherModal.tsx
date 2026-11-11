"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from "@/shared/ui";
import { EyeIcon, EyeOffIcon, UserPlusIcon } from "@/shared/ui/icons";
import {
  CreateCasherSchema,
  type CreateCasherFormData,
  type CasherUser,
} from "../schemas";
import { useCreateCasher } from "../hooks";

interface CreateCasherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newCasher: CasherUser) => void;
  defaultRole?: "casher" | "admin";
}

function generateDemoPhone(): string {
  // Generates Ethiopian mobile format: +2519 + 8 random digits
  const suffix = Math.floor(10000000 + Math.random() * 90000000);
  return `+2519${suffix}`;
}

export function CreateCasherModal({
  open,
  onOpenChange,
  onSuccess,
  defaultRole = "casher",
}: CreateCasherModalProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [hasManuallyEditedUsername, setHasManuallyEditedUsername] = React.useState(false);
  const createMutation = useCreateCasher();

  const form = useForm<CreateCasherFormData>({
    resolver: zodResolver(CreateCasherSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      username: "",
      password: "Password123!",
      role: defaultRole,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Auto-suggest username based on email if not manually edited
  const watchedEmail = watch("email");
  React.useEffect(() => {
    if (!hasManuallyEditedUsername && watchedEmail) {
      const emailPrefix = watchedEmail.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "");
      if (emailPrefix) {
        setValue("username", emailPrefix, { shouldValidate: true });
      }
    }
  }, [watchedEmail, hasManuallyEditedUsername, setValue]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      reset({
        full_name: "",
        email: "",
        phone: generateDemoPhone(),
        username: "",
        password: "Password123!",
        role: defaultRole,
      });
      setShowPassword(false);
      setHasManuallyEditedUsername(false);
    }
  }, [open, reset, defaultRole]);

  const onSubmit = async (data: CreateCasherFormData) => {
    try {
      const newUser = await createMutation.mutateAsync(data);
      onSuccess?.(newUser);
      onOpenChange(false);
      reset();
    } catch {
      // Error is caught and toasted by useCreateCasher
    }
  };

  const handleUseDemoPassword = () => {
    setValue("password", "Password123!", { shouldValidate: true, shouldDirty: true });
  };

  const handleQuickDemoPhone = () => {
    setValue("phone", generateDemoPhone(), { shouldValidate: true, shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-6 bg-card border border-border shadow-xl rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UserPlusIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Create New Casher
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new transit cashier account with direct operational access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1">
            <label
              htmlFor="casher-full-name"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>Full Name <span className="text-danger">*</span></span>
              <span className="text-[10px] text-muted-foreground font-normal">First & Last Name</span>
            </label>
            <Input
              id="casher-full-name"
              placeholder="e.g. Abebe Bikila"
              {...register("full_name")}
              disabled={isSubmitting || createMutation.isPending}
              className="h-9 text-xs"
            />
            {errors.full_name && (
              <p className="text-[11px] text-danger">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <label
              htmlFor="casher-email"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>Email Address <span className="text-danger">*</span></span>
              <span className="text-[10px] text-muted-foreground font-normal">e.g. cashier2@bus.et</span>
            </label>
            <Input
              id="casher-email"
              type="email"
              placeholder="cashier2@bus.et"
              {...register("email")}
              disabled={isSubmitting || createMutation.isPending}
              className="h-9 text-xs"
            />
            {errors.email && (
              <p className="text-[11px] text-danger">{errors.email.message}</p>
            )}
          </div>

          {/* Username & Phone Number in a 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Username */}
            <div className="space-y-1">
              <label
                htmlFor="casher-username"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span>Username <span className="text-danger">*</span></span>
              </label>
              <Input
                id="casher-username"
                placeholder="cashier2"
                {...register("username", {
                  onChange: () => setHasManuallyEditedUsername(true),
                })}
                disabled={isSubmitting || createMutation.isPending}
                className="h-9 text-xs"
              />
              {errors.username && (
                <p className="text-[11px] text-danger">{errors.username.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="casher-phone"
                  className="text-xs font-semibold text-foreground"
                >
                  Phone <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleQuickDemoPhone}
                  className="text-[10px] text-primary hover:underline"
                  title="Generate a unique demo phone number"
                >
                  New Phone
                </button>
              </div>
              <Input
                id="casher-phone"
                placeholder="+251911223344"
                {...register("phone")}
                disabled={isSubmitting || createMutation.isPending}
                className="h-9 text-xs"
              />
              {errors.phone && (
                <p className="text-[11px] text-danger">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Password with Show/Hide toggle and Demo Password helper */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="casher-password"
                className="text-xs font-semibold text-foreground"
              >
                Password <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={handleUseDemoPassword}
                className="text-[10px] text-primary font-medium hover:underline flex items-center gap-1"
              >
                ⚡ Use Password123!
              </button>
            </div>
            <div className="relative">
              <Input
                id="casher-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                disabled={isSubmitting || createMutation.isPending}
                className="h-9 text-xs pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-danger">{errors.password.message}</p>
            )}
          </div>

          {/* Role selector: Casher (default) vs Admin */}
          <div className="space-y-1">
            <label
              htmlFor="casher-role"
              className="text-xs font-semibold text-foreground"
            >
              Account Role
            </label>
            <select
              id="casher-role"
              {...register("role")}
              disabled={isSubmitting || createMutation.isPending}
              className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="casher">Casher (Bus & Ticket Operations)</option>
              <option value="admin">Admin (System Administrator)</option>
            </select>
            {errors.role && (
              <p className="text-[11px] text-danger">{errors.role.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || createMutation.isPending}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <UserPlusIcon className="h-4 w-4" />
              {isSubmitting || createMutation.isPending
                ? "Creating Casher..."
                : "Create Casher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
