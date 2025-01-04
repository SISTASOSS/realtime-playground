"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { useProcessContext } from "@/hooks/use-process";

export default function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const { setEvaUrl, setJwtToken } = useProcessContext();

  useEffect(() => {
    // Track pageviews
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
      console.log("captured pageview", url);

      setEvaUrl(decodeURIComponent(searchParams.get('url')));
      setJwtToken(searchParams.get('token'));
    }
  }, [pathname, searchParams, posthog, setEvaUrl, setJwtToken]);

  return null;
}
