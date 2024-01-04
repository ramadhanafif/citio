import { create, Message, Whatsapp } from "venom-bot";
import "dotenv/config";
import PocketBase from "pocketbase";
import { Collections, TypedPocketBase } from "./pocketbase-types.js";

import { addDays, formatISO9075 } from "date-fns";

import MultiLineMessage, { CreateReminderMessage } from "./utils/message.js";
import {
  generateCurrentDateTime,
  getTimeSinceStart,
  setStartingTime,
} from "./utils/timeinfo.js";
import { schedule } from "node-cron";

const pb = new PocketBase(process.env.POCKETBASE_URL!) as TypedPocketBase;

main();

async function main() {
  try {
    const client = await create({
      session: "main",
    });

    client.isLoggedIn().then(() => setStartingTime());
    start(client);
  } catch (error) {
    console.error(error);
  }
}

function incomingMsgHandler(client: Whatsapp, message: Message) {
  if (message.body.toLowerCase() === "!status") {
    const reply = new MultiLineMessage();

    reply.addMessage(
      `Pesan ini dibuat pada waktu: ${generateCurrentDateTime()}`
    );
    reply.addMessage(`Berjalan selama: ${getTimeSinceStart()}`);

    client
      .sendText(message.from, reply.getMessages())
      .then((result) => {
        console.log("Result: ", result); //return object success
      })
      .catch((erro) => {
        console.error("Error when sending: ", erro); //return object error
      });
  }

  if (message.body.toLowerCase() === "!forcereminder") {
    RunMessageGeneration(client);
  }

  if (message.body.startsWith("!materi")) {
    console.log("Materi command received");
    // Exmaple input message

    // !materi
    // materi: Mad Harfi Musyba'
    // pemateri: Umi Ema
    // pendamping: Umi Eni
    // tanggal: 02/01/2024
    // kelas: A

    const input = message.body.split("\n");
    if (input.length === 1) {
      client.sendText(message.from, "Format pesan salah");
      return;
    }

    const validKeys = new Set([
      "materi",
      "pemateri",
      "pendamping",
      "tanggal",
      "kelas",
    ]);
    const readKeys = new Set<string>();
    let missingKeys: string[] = [];
    const readData = new Map<string, string>();

    const regex = /(\w+)\s?:\s?(.*)$/;
    input.forEach((line) => {
      const capGroup = line.match(regex);
      if (capGroup) {
        const key = capGroup[1].toLowerCase();
        const value = capGroup[2];

        if (validKeys.has(key)) {
          readKeys.add(key);
          readData.set(key, value);
        }
      }
    });

    if (readKeys.size !== validKeys.size) {
      missingKeys = [...validKeys].filter((key) => !readKeys.has(key));
      console.log(missingKeys);
      client.sendText(
        message.from,
        `Format pesan salah!\nMasukkan juga: ${missingKeys.join(", ")}`
      );
      return;
    }

    // push to db
    // TODO: typescript remove undefined because check already done
    const newClassTopic = {
      materi: readData.get("materi"),
      pemateri: readData.get("pemateri"),
      pendamping: readData.get("pendamping"),
      tanggal: readData.get("tanggal"),
      kelas: readData.get("kelas"),
      reminder: false,
    };


  }
}

function start(client: Whatsapp) {
  client.onMessage((message) => incomingMsgHandler(client, message));

  // Minute 1 and 2, hour 5, everyday
  schedule("0,1 5 * * *", () => RunMessageGeneration(client));
}

async function RunMessageGeneration(client: Whatsapp) {
  const tommorow = formatISO9075(addDays(new Date(), 1));
  const today = formatISO9075(new Date());

  try {
    await pb.admins.authWithPassword(
      process.env.ADMIN_USER!,
      process.env.ADMIN_PASS!
    );

    const fetchResult = await pb
      .collection(Collections.ClassSimple)
      .getList(1, 50, {
        filter: `tanggal <= "${tommorow}" && tanggal >= "${today}"`,
      });

    if (fetchResult.items.length === 0) {
      console.log("no class tommorow");
      return;
    }

    const needReminder = fetchResult.items;
    // .filter((item) => item.reminder);
    if (needReminder.length === 0) {
      console.log("All reminder has been sent");
      return;
    }

    await client.sendText(
      process.env.TEST_API_GROUP!,
      CreateReminderMessage(needReminder)
    );

    // Update reminder column in database
    needReminder.forEach(async (item) => {
      await pb
        .collection(Collections.ClassSimple)
        .update(item.id, { reminder: true });
      console.log("Reminder sent for ", item.materi);
    });

    // Clear auth token, alias logout
    pb.authStore.clear();
  } catch (error) {
    console.log("Msg check routine error: ", error);
  }
}
