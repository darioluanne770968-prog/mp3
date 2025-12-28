import Link from "next/link";
import { Music, Video, FileText, RefreshCw } from "lucide-react";

const toolCategories = [
  {
    title: "Audio Tools",
    icon: Music,
    tools: [
      { name: "Trim Audio", href: "/audio/trim" },
      { name: "Merge Audio", href: "/audio/merge" },
      { name: "Change Volume", href: "/audio/volume" },
      { name: "Change Speed", href: "/audio/speed" },
      { name: "Audio Converter", href: "/convert/audio" },
    ],
  },
  {
    title: "Video Tools",
    icon: Video,
    tools: [
      { name: "Trim Video", href: "/video/trim" },
      { name: "Crop Video", href: "/video/crop" },
      { name: "Rotate Video", href: "/video/rotate" },
      { name: "Add Music", href: "/video/add-music" },
      { name: "Video Converter", href: "/convert/video" },
    ],
  },
  {
    title: "PDF Tools",
    icon: FileText,
    tools: [
      { name: "PDF to Word", href: "/pdf/to-word" },
      { name: "PDF to Excel", href: "/pdf/to-excel" },
      { name: "Merge PDF", href: "/pdf/merge" },
      { name: "Split PDF", href: "/pdf/split" },
      { name: "Compress PDF", href: "/pdf/compress" },
    ],
  },
  {
    title: "Converters",
    icon: RefreshCw,
    tools: [
      { name: "Audio Converter", href: "/convert/audio" },
      { name: "Video Converter", href: "/convert/video" },
      { name: "Image Converter", href: "/convert/image" },
      { name: "Document Converter", href: "/convert/document" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {toolCategories.map((category) => (
            <div key={category.title}>
              <div className="flex items-center gap-2 mb-4">
                <category.icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{category.title}</h3>
              </div>
              <ul className="space-y-2">
                {category.tools.map((tool) => (
                  <li key={tool.href}>
                    <Link
                      href={tool.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Media Tools. All files are processed locally and deleted after 24 hours.</p>
        </div>
      </div>
    </footer>
  );
}
