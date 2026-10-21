import {
  ShieldCheck,
  QrCode,
  BriefcaseBusiness,
  Video,
  FileSearch,
  type LucideIcon,
} from "lucide-react";

export type ModuleId = "upi" | "qr" | "job" | "deepfake" | "document";

export interface ModuleMeta {
  id: ModuleId;
  no: string;
  label: string;
  labelHi: string;
  blurb: string;
  blurbHi: string;
  method: string;
  accepts: string;
  icon: LucideIcon;
}

export const MODULES: ModuleMeta[] = [
  {
    id: "upi",
    no: "01",
    label: "Payment screenshot",
    labelHi: "भुगतान स्क्रीनशॉट",
    blurb:
      "A payment screenshot is not a payment. Check the pixels, the UTR and the PSP handle before you ship goods.",
    blurbHi:
      "स्क्रीनशॉट भुगतान नहीं होता। सामान भेजने से पहले पिक्सेल, UTR और PSP हैंडल जाँचें।",
    method: "ELA heatmap · NPCI UTR · PSP registry",
    accepts: "PNG · JPG · WEBP",
    icon: ShieldCheck,
  },
  {
    id: "qr",
    no: "02",
    label: "QR code & link",
    labelHi: "QR कोड व लिंक",
    blurb:
      "A QR that 'sends' you money still debits you. Decode the payload before the camera app asks for your PIN.",
    blurbHi:
      "पैसे 'भेजने' वाला QR आपका खाता काटता है। पिन डालने से पहले पेलोड पढ़ें।",
    method: "QR payload decode · intent parser · link graph",
    accepts: "PNG · JPG · WEBP",
    icon: QrCode,
  },
  {
    id: "job",
    no: "03",
    label: "Job offer letter",
    labelHi: "नौकरी ऑफर लेटर",
    blurb:
      "No employer charges you to be hired. Screen the letter for CIN mismatches, impossible salaries and upfront fees.",
    blurbHi:
      "कोई कंपनी नौकरी के पैसे नहीं लेती। CIN, वेतन और अग्रिम फीस की जाँच करें।",
    method: "CIN / MCA checks · salary anomaly · fee flags",
    accepts: "TXT · TEXT · pasted text",
    icon: BriefcaseBusiness,
  },
  {
    id: "deepfake",
    no: "04",
    label: "Deepfake call",
    labelHi: "डीपफेक कॉल",
    blurb:
      "A uniform on a video call is not a warrant. Inspect the file for seam, blink and temporal artefacts.",
    blurbHi:
      "वीडियो कॉल पर वर्दी वारंट नहीं होती। सीम, पलक और टेम्पोरल आर्टिफैक्ट जाँचें।",
    method: "frame sampling · facial seam · temporal drift",
    accepts: "MP4 · MOV · WEBM",
    icon: Video,
  },
  {
    id: "document",
    no: "05",
    label: "Document & bill",
    labelHi: "दस्तावेज़ व बिल",
    blurb:
      "Court notices, discom bills and refund letters are forged constantly. Verify metadata, fonts and seals.",
    blurbHi:
      "कोर्ट नोटिस, बिजली बिल और रिफंड लेटर अक्सर जाली होते हैं। मेटाडेटा, फॉन्ट व मुहर जाँचें।",
    method: "metadata · font census · seal & signature",
    accepts: "PDF · PNG · JPG",
    icon: FileSearch,
  },
];

export const moduleById = (id: string) =>
  MODULES.find((m) => m.id === id) ?? MODULES[0];
