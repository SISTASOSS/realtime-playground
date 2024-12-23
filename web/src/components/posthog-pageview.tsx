"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { useProcessContext } from "@/hooks/use-process";

export default function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const { setJwtToken } = useProcessContext();

  useEffect(() => {
    // Track pageviews
    if (pathname && posthog) {
      let url = window.origin + pathname;
      const params = searchParams.toString();
      const [key, value] = params.split("=");

      setJwtToken(value);

      if (params) {
        url = url + `?${params}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
      console.log("captured pageview", url);
    }
  }, [pathname, searchParams, posthog, setJwtToken]);

  return null;
}
