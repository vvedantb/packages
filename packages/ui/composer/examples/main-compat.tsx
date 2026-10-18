import { createRoot } from "react-dom/client";
import { Fixture } from "./Fixture";
import "./styles-compat.css";

createRoot(document.getElementById("root")!).render(<Fixture />);
