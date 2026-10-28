import QRCode from "qrcode";

// QR em PNG grande (bom para imprimir), na cor do texto da maquete sobre fundo branco.
export const qrPng = async (url: string, arquivo: string, cor = "#1F2726") => {
  await QRCode.toFile(arquivo, url, { type: "png", width: 1200, margin: 2, errorCorrectionLevel: "M", color: { dark: cor, light: "#FFFFFF" } });
  return arquivo;
};
