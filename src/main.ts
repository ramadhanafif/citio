import { create, Message, Whatsapp } from "venom-bot";
import PocketBase from "pocketbase";
import {
  ClassSimpleResponse,
  Collections,
  TypedPocketBase,
} from "./pocketbase-types.js";

import { addDays, format, formatISO9075 } from "date-fns";
import { id } from "date-fns/locale";

import "dotenv/config";

let startingTime = new Date();
const pb = new PocketBase(process.env.POCKETBASE_URL!) as TypedPocketBase;

create({
  session: "main",
})
  .then((client) => {
    client.isLoggedIn().then(() => (startingTime = new Date()));
    start(client);
  })
  .catch((erro) => {
    console.log(erro);
  });

class MultiLineMessage extends Array<string> {
  constructor() {
    super();
  }

  addMessage(message: string) {
    this.push(message);
  }

  getMessages() {
    return this.join("\n");
  }
}

function generateCurrentDateTime() {
  return new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function getTimeSinceStart() {
  return new Date(new Date().getTime() - startingTime.getTime())
    .toISOString()
    .slice(11, 19);
}

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

function CreateReminderMessage(classData: ClassSimpleResponse[]) {
  const msg = new MultiLineMessage();
  const currentDate = format(new Date(), "PPPP", { locale: id });

  // Header
  msg.addMessage("PENGINGAT JADWAL CITIO");
  msg.addMessage(`Untuk ${currentDate.toUpperCase()}`);
  msg.addMessage("");

  // Body
  classData.forEach((item) => {
    msg.addMessage(`Materi: ${item.materi}`);
    msg.addMessage(`Kelas : ${item.kelas}`);
    msg.addMessage(`Pemateri : ${item.pemateri}`);
    msg.addMessage(`Pendamping: ${item.pendamping}`);
    msg.addMessage("");
  });

  // Footer
  msg.addMessage(
    "_Sebaik-baik kalian adalah yang belajar dan mengajarkan Al-Qur'an_ [HR. Bukhari, no. 5027]"
  );
  msg.addMessage("");
  msg.addMessage("*CitiO*");
  msg.addMessage("*Class Tahsin Online*");
  msg.addMessage("_Belajar AlQuran Mudah Kapanpun Dimanapun_");

  return msg.getMessages();
}
