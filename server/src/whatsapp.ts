import { WebSocket } from "ws";

import { Client, Contact, MessageMedia } from "whatsapp-web.js";

import { sendEvent } from "./ws";
import { Base64 } from "./types";
import { SimpleContact } from "./interfaces";
import { EventType } from "../../interfaces/api";
import { getFromCache } from "./cache";

const puppeteerOptions = {
  puppeteer: {
    executablePath:
      process.env.RUNNING_IN_DOCKER === "true"
        ? "/usr/bin/chromium-browser"
        : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  },
};

export function initWhatsApp(id: string): Client {
  const client = new Client(puppeteerOptions);

  client.on("qr", (qr: string) => {
    let ws = getFromCache(id, "ws");
    sendEvent(ws, EventType.WhatsAppQR, qr);
  });

  client.on("ready", async () => {
    let ws = getFromCache(id, "ws");
    sendEvent(ws, EventType.Redirect, "/gauth");
  });

  client.on("auth_failure", (msg) => {});

  client.initialize();
  return client;
}

export async function loadContacts(
  client: Client
): Promise<Array<SimpleContact>> {
  const contacts: Contact[] = await client.getContacts();

  const simpleContacts: Array<SimpleContact> = contacts
    .filter((contact) => contact.isMyContact)
    .map(
      (contact) =>
        <SimpleContact>{
          id: contact.id._serialized,
          numbers: [contact.number],
        }
    );

  return simpleContacts;
}

export async function downloadFile(
  client: Client,
  whatsappId: string
): Promise<Base64 | null> {
  const photoUrl = await client.getProfilePicUrl(whatsappId);
  if (!photoUrl) {
    return null;
  }

  const image = await MessageMedia.fromUrl(photoUrl);
  return image.data;
}
