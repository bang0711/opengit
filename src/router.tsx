import { createHashRouter } from "react-router-dom";
import { Blame, blameLoader } from "./routes/blame";
import { Conflicts, conflictsLoader } from "./routes/conflicts";
import { Diff, diffLoader } from "./routes/diff";
import { Home, homeLoader } from "./routes/home";

export const router = createHashRouter([
  { path: "/", element: <Home />, loader: homeLoader },
  { path: "/diff", element: <Diff />, loader: diffLoader },
  { path: "/blame", element: <Blame />, loader: blameLoader },
  { path: "/conflicts", element: <Conflicts />, loader: conflictsLoader },
]);
