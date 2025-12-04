import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlayerPage } from "./screens/PlayerPage";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <PlayerPage />
  </StrictMode>,
);
