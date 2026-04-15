import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Feature } from "@/types";
import FileDropzone from "./FileDropzone";

interface Props {
  feature: Feature;
  onRun: (file: File) => void;
  isRunning: boolean;
}

export default function WorkflowLauncher({ feature, onRun, isRunning }: Props) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Feature header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          {feature.name}
        </h1>
        <p className="text-sm text-muted-foreground">{feature.description}</p>
      </div>

      {/* Upload zone */}
      <FileDropzone
        accept={feature.input_accept}
        file={file}
        onFile={setFile}
        disabled={isRunning}
      />

      {/* Run button */}
      <Button
        onClick={() => file && onRun(file)}
        disabled={!file || isRunning}
        className={cn("self-start gap-2", isRunning && "opacity-70")}
      >
        {isRunning && (
          <span className="inline-block h-3.5 w-3.5 border-gray-200 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
        )}
        {isRunning ? "Running…" : "Run"}
      </Button>
    </div>
  );
}
