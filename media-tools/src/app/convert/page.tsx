import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  FileAudio,
  FileVideo,
  ImageIcon,
  File,
  Type,
  Package,
} from "lucide-react";

const converters = [
  { name: "Audio Converter", description: "MP3, WAV, M4A, OGG, FLAC...", icon: FileAudio, href: "/convert/audio" },
  { name: "Video Converter", description: "MP4, WebM, AVI, MOV, MKV...", icon: FileVideo, href: "/convert/video" },
  { name: "Image Converter", description: "PNG, JPG, WebP, GIF, BMP...", icon: ImageIcon, href: "/convert/image" },
  { name: "Document Converter", description: "PDF, DOCX, TXT, RTF, HTML...", icon: File, href: "/convert/document" },
  { name: "Font Converter", description: "TTF, OTF, WOFF, WOFF2, EOT...", icon: Type, href: "/convert/font" },
  { name: "Archive Tools", description: "ZIP, RAR, 7Z, TAR.GZ...", icon: Package, href: "/convert/archive" },
];

export default function ConvertersPage() {
  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-green-600 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Format Converters</h1>
            <p className="text-muted-foreground">Convert files between different formats</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {converters.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
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
