/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

import type { SAppNavAttributes } from "@shopify/app-bridge-types";
import type { AnchorHTMLAttributes, DetailedHTMLProps } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": SAppNavAttributes;
      "s-link": DetailedHTMLProps<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
      >;
    }
  }
}

export {};
