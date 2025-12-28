import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  FileSpreadsheet,
  Image,
  FilePlus,
  Split,
  Minimize2,
  Lock,
  Unlock,
  RotateCw,
} from "lucide-react";

const pdfTools = [
  { name: "PDF to Word", description: "Convert PDF to editable Word documents", icon: FileText, href: "/pdf/to-word" },
  { name: "PDF to Excel", description: "Extract tables from PDF to Excel", icon: FileSpreadsheet, href: "/pdf/to-excel" },
  { name: "PDF to JPG", description: "Convert PDF pages to image files", icon: Image, href: "/pdf/to-jpg" },
  { name: "Word to PDF", description: "Convert Word documents to PDF", icon: FileText, href: "/pdf/from-word" },
  { name: "Merge PDF", description: "Combine multiple PDFs into one", icon: FilePlus, href: "/pdf/merge" },
  { name: "Split PDF", description: "Split PDF into separate pages", icon: Split, href: "/pdf/split" },
  { name: "Compress PDF", description: "Reduce PDF file size", icon: Minimize2, href: "/pdf/compress" },
  { name: "Protect PDF", description: "Add password protection", icon: Lock, href: "/pdf/protect" },
  { name: "Unlock PDF", description: "Remove password protection", icon: Unlock, href: "/pdf/unlock" },
  { name: "Rotate PDF", description: "Rotate PDF pages", icon: RotateCw, href: "/pdf/rotate" },
];

export default function PDFToolsPage() {
  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-red-600 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">PDF Tools</h1>
            <p className="text-muted-foreground">Convert, merge, split, and edit PDF files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfTools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <tool.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
