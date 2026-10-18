import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Input,
  SonnerToaster,
  Switch,
  Textarea,
} from "../../../src";

export function Fixture() {
  const [dark, setDark] = useState(false);
  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen space-y-6 bg-background p-8 text-foreground">
        <section className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setDark((d) => !d)}>Toggle theme</Button>
          <Button onClick={() => toast("Saved", { description: "Fixture toast" })}>
            Show toast
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Dialog</DialogTitle>
              <DialogDescription>Body text on the popover colour.</DialogDescription>
            </DialogContent>
          </Dialog>
        </section>
        <section className="grid max-w-md gap-3">
          <Input placeholder="Input placeholder" />
          <Textarea placeholder="Textarea placeholder" />
          <Switch defaultChecked aria-label="Sample switch" />
        </section>
        <SonnerToaster />
      </main>
    </div>
  );
}
