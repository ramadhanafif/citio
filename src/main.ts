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
import { DateTime } from "luxon";

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
  console.log("Message:", message);
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

  if (message.body.toLowerCase() === "!formatmateri") {
    const msg = new MultiLineMessage();
    msg.addMessage("Contoh format pesan yang diterima oleh bot");
    msg.addMessage("!materi");

    msg.addMessage("materi: Mad Harfi Musyba'");
    msg.addMessage("pemateri: Umi Ema");
    msg.addMessage("pendamping: Umi Eni");
    msg.addMessage("tanggal: 31/12/2023");
    msg.addMessage("kelas: A");
  }

  if (message.body.startsWith("!materi")) {
    console.log("Materi command received");

    const input = message.body.split("\n");
    if (input.length === 1) {
      const msg = new MultiLineMessage();

      msg.addMessage("Format pesan salah");
      msg.addMessage(
        "Kirim !formatmateri untuk mengetahui format penambahan jadwal baru"
      );

      client.sendText(message.from, msg.getMessages());
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
      if (!capGroup) {
        console.log("No matching regex");
        return;
      }

      const key = capGroup[1].toLowerCase();
      const value = capGroup[2];

      if (validKeys.has(key) === false) {
        console.log("Invalid key, skip");
        return;
      }

      readKeys.add(key);
      if (key === "tanggal") {
        const parsedTime = DateTime.fromFormat(value, "d/L/y");
        if (parsedTime.isValid) {
          // NOTE: Hardcoded class be scheduled at 5 AM

          readData.set(key, parsedTime.plus({ hours: 5 }).toISO());
        }
      } else {
        readData.set(key, value);
      }
    });

    if (readKeys.size !== validKeys.size) {
      missingKeys = [...validKeys].filter((key) => !readKeys.has(key));

      const msg = new MultiLineMessage();
      msg.addMessage("Format pesan salah!");
      msg.addMessage("Pastikan kolom ini terisi dengan benar:");
      msg.addMessage(missingKeys.join(", "));

      client.sendText(message.from, msg.getMessages());
      return;
    }

    // push to db
    const newClassTopic = {
      materi: readData.get("materi")!,
      pemateri: readData.get("pemateri")!,
      pendamping: readData.get("pendamping")!,
      tanggal: readData.get("tanggal")!,
      kelas: readData.get("kelas")!,
      reminder: false,
    };

    pb.collection(Collections.ClassSimple)
      .create(newClassTopic)
      .then((record) =>
        client.sendText(
          message.from,
          `Penambahan materi ${record.materi} sukses dengan id ${
            record.id
          } pada ${DateTime.fromJSDate(new Date(record.created)).toLocaleString(
            DateTime.DATETIME_MED
          )}`
        )
      )
      .catch(() => {
        client.sendText(
          message.from,
          "Error dalam menyimpan di database. Coba lagi!"
        );
      });
  }
}

function start(client: Whatsapp) {
  pb.admins
    .authWithPassword(process.env.ADMIN_USER!, process.env.ADMIN_PASS!)
    .then(() => {
      client.onMessage((message) => incomingMsgHandler(client, message));

      // Minute 0 and 1, hour 5, everyday
      schedule("0,1 17 * * *", () => RunMessageGeneration(client));
    })
    .catch((error) => console.log(error));
}

async function RunMessageGeneration(client: Whatsapp) {
  const tommorow = formatISO9075(addDays(new Date(), 1));
  const today = formatISO9075(new Date());

  try {
    const fetchResult = await pb
      .collection(Collections.ClassSimple)
      .getList(1, 50, {
        filter: `tanggal <= "${tommorow}" && tanggal >= "${today}"`,
      });

    if (fetchResult.items.length === 0) {
      console.log("no class tommorow");
      return;
    }

    const needReminder = fetchResult.items.filter((item) => !item.reminder);
    if (needReminder.length === 0) {
      console.log("All reminder has been sent");
      return;
    }

    // Sort message alphabetically
    needReminder.sort((a, b) => {
      return a.kelas.localeCompare(b.kelas);
    });
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
  } catch (error) {
    console.log("Msg check routine error: ", error);
  }
}
