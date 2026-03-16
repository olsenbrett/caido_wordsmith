import type { Caido } from "@caido/sdk-frontend";
import type { API, BackendEvents } from "caido-wordsmith-backend";

import { createPage } from "./page.js";

import "./styles/style.css";

export type CaidoSDK = Caido<API, BackendEvents>;

const PAGE_PATH = "/wordsmith" as const;

export const init = (sdk: CaidoSDK) => {
  const body = createPage(sdk);

  sdk.navigation.addPage(PAGE_PATH, { body });

  sdk.sidebar.registerItem("Wordsmith", PAGE_PATH, {
    icon: "fas fa-list",
  });
};
