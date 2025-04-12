import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BuilderAndCountries,
  ModuleList,
  NameDescription,
  SDKResponseList,
  URLList,
} from "@/components/WorkflowMetadata";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default async function WorkflowPage({
  params,
}: {
  params: { appId: string; workflowId: string };
}) {
  const { appId, workflowId } = await params;

  // ... (unchanged: fetching and result parsing)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/workflows?appId=${appId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading workflows</AlertTitle>
        <AlertDescription>AppId: {appId}</AlertDescription>
      </Alert>
    );
  }

  const files = await res.json();
  const match = files.find((f: any) => f.name === workflowId);
  if (!match) return notFound();

  const encodedUrl = encodeURIComponent(match.download_url);
  const validationRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/workflow-detail?download_url=${encodedUrl}`,
    { cache: "no-store" }
  );

  if (!validationRes.ok) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Validation failed</AlertTitle>
        <AlertDescription>{workflowId}</AlertDescription>
      </Alert>
    );
  }

  const result = await validationRes.json();
  const issues = result.issues ?? [];
  const workflow = result.workflow;
  const properties = workflow?.properties || {};
  const modules = workflow?.modules || [];

  const errorCount = issues.filter((i: any) => i.type === "ERROR").length;
  const warningCount = issues.filter((i: any) => i.type === "WARNING").length;

  const countries: string[] = modules[0]?.properties?.countriesSupported || [];
  const subTypes = modules.map((m: any) => m.subType as string);
  const moduleTypes: string[] = [...new Set<string>(subTypes)];
  const sdkResponses: string[] = Object.keys(workflow?.sdkResponse || {});
  const urls: { url: string; env: string }[] = modules
    .filter((m: any) => m.subtype !== "dynamicForm" && m.properties?.url)
    .map((m: any) => {
      const rawUrl = m.properties.url.toLowerCase();
      let env = "prod";
      if (rawUrl.includes("dev")) env = "dev";
      else if (rawUrl.includes("uat")) env = "uat";
      else if (rawUrl.includes("test")) env = "test";
      else if (rawUrl.includes("stage") || rawUrl.includes("staging"))
        env = "staging";
      return { url: m.properties.url, env };
    });

  return (
    <main className="max-w-5xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-bold">
        Deep insights for <span className="text-primary">{workflowId}</span>
      </h1>

      <div className="grid grid-cols-1">
        <div className="space-y-4">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                Validation Status
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-wrap items-center gap-3">
              {result.success ? (
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ✅ Passed
                </Badge>
              ) : (
                <>
                  <Badge
                    variant="outline"
                    className="border-destructive text-destructive px-3 py-1.5 text-sm"
                  >
                    ❌ Errors: {errorCount}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-yellow-500 text-yellow-500 px-3 py-1.5 text-sm"
                  >
                    ⚠️ Warnings: {warningCount}
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {!result.success && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-sm text-primary underline hover:opacity-80 transition mt-4">
                View Validation Details
              </button>
            </DialogTrigger>

            {/* Overlay with blur */}
            <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

            <DialogContent className="max-w-6xl z-50">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Validation Issues
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  These issues were detected during validation.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 max-h-[400px] overflow-y-auto pr-1">
                <ul className="space-y-4 text-sm">
                  {issues.map((issue: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${
                          issue.type === "ERROR"
                            ? "text-destructive border border-destructive bg-destructive/10"
                            : "text-yellow-600 border border-yellow-500 bg-yellow-500/10"
                        }`}
                      >
                        {issue.type?.toUpperCase() ?? "ISSUE"}
                      </span>
                      <div className="text-foreground leading-snug">
                        <span className="font-semibold">
                          {issue.code ?? "Issue"}:
                        </span>{" "}
                        {issue.text}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Metadata - 3 column layout */}
      <div className="grid md:grid-cols-3 gap-6 ">
        <Card>
          <CardHeader>
            <CardTitle>Name & Description</CardTitle>
          </CardHeader>
          <CardContent>
            <NameDescription
              name={properties.name}
              description={properties.description}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Builder Info & Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <BuilderAndCountries
              isBuiltOnBuilder={properties.isBuiltOnBuilder ?? false}
              countries={countries}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules Used</CardTitle>
          </CardHeader>
          <CardContent>
            <ModuleList modules={moduleTypes} />
          </CardContent>
        </Card>
      </div>

      {/* SDK Responses */}
      <div className="grid grid-cols-1">
        <Card>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="sdk-responses">
              <AccordionTrigger className="flex items-center justify-between w-full p-2 cursor-pointer">
                <div className="flex-1">
                  <CardHeader className="p-2">
                    <CardTitle className="text-left">SDK Responses</CardTitle>
                  </CardHeader>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent>
                  <SDKResponseList responses={sdkResponses} />
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      {/* URLs Used */}
      <div className="grid grid-cols-1">
        <Card>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="urls-used">
              <AccordionTrigger className="flex items-center justify-between w-full p-2 cursor-pointer">
                <CardHeader className="p-0 flex-1">
                  <CardTitle className="text-left">URLs Used</CardTitle>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent>
                  <URLList urls={urls} />
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>
    </main>
  );
}
