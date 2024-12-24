"use client";

import React, { useEffect } from "react";
import { usePlaygroundState } from "@/hooks/use-playground-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthBanner } from "./authBanner";

const AuthFormSchema = z.object({
  openaiAPIKey: z.string().min(1, { message: "Key is required" }),
});

export function Auth() {
  const { pgState, dispatch, showAuthDialog, setShowAuthDialog } =
    usePlaygroundState();

  const onLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dispatch({ type: "SET_API_KEY", payload: null });
    setShowAuthDialog(true);
  };

  return (
    <div>
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthComplete={() => setShowAuthDialog(false)}
      />
    </div>
  );
}

export function AuthDialog({
  open,
  onOpenChange,
  onAuthComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthComplete: () => void;
}) {
  const { pgState, dispatch } = usePlaygroundState();
  const form = useForm<z.infer<typeof AuthFormSchema>>({
    resolver: zodResolver(AuthFormSchema),
    defaultValues: {
      openaiAPIKey: pgState.openaiAPIKey || "",
    },
  });

  // Add this useEffect hook to watch for changes in pgState.openaiAPIKey
  useEffect(() => {
    form.setValue("openaiAPIKey", pgState.openaiAPIKey || "");
  }, [pgState.openaiAPIKey, form]);

  function onSubmit(values: z.infer<typeof AuthFormSchema>) {
    dispatch({ type: "SET_API_KEY", payload: values.openaiAPIKey || null });
    onOpenChange(false);
    onAuthComplete();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 border-0 rounded-lg overflow-hidden max-h-[90vh] flex flex-col"
        isModal={true}
      >
        <div className="overflow-y-auto">
          <AuthBanner />
          <div className="px-6 pb-6 pt-4 overflow-y-auto">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <DialogHeader className="gap-2">
                  <DialogTitle>Gerçek Zamanlı Konuşma, Oyun Alanı</DialogTitle>
                  <DialogDescription>
                    Oyun alanını kullanabilmek için anahtarı girmeniz
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-black/10 h-[1px] w-full" />
                <FormField
                  control={form.control}
                  name="openaiAPIKey"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 w-full">
                          <FormControl className="w-full">
                            <Input
                              className="w-full"
                              placeholder="Anahtar"
                              {...field}
                            />
                          </FormControl>
                          <Button type="submit">Bağlan</Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <div className="h-[45vh] sm:h-0"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
