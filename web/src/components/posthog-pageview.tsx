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

      const evaUrl = searchParams.get('url');
      if (!evaUrl) {
        console.warn("No 'url' found in search parameters.");
      }
      setEvaUrl(decodeURIComponent(evaUrl || ''));

      const token = searchParams.get('token');
      if (!token) {
        console.warn("No 'token' found in search parameters.");
      }
      setJwtToken(token || '');
    }
  }, [pathname, searchParams, posthog, setEvaUrl, setJwtToken]);

  return null;
}
