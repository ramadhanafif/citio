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

const pb = new PocketBase(process.env.POCKETBASE_URL!) as TypedPocketBase;

create({
  session: "main",
})
  .then((client) => {
    client.isLoggedIn().then(() => setStartingTime());
    start(client);
  })
  .catch((erro) => {
    console.log(erro);
  });

function incomingMsgHandler(client: Whatsapp, message: Message) {
  if (message.body === "!status") {
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
  } else {
    console.log(message);
    client
      .sendMentioned(message.from, "Halo @628561052550", ["628561052550"])
      .then((result) => console.log(result));
  }
}

function start(client: Whatsapp) {
  client.onMessage((message) => incomingMsgHandler(client, message));
  RunMessageGeneration(client);
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

    const needReminder = fetchResult.items.filter((item) => !item.reminder);
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
