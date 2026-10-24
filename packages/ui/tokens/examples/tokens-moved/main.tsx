import { createRoot } from "react-dom/client";
import { Fixture } from "./Fixture";
import "./styles.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<Fixture />);
