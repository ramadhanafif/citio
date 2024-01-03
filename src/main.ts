import { create, Message, Whatsapp } from "venom-bot";
import PocketBase from "pocketbase";
import {
  ClassSimpleResponse,
  Collections,
  TypedPocketBase,
} from "./pocketbase-types.js";

import { addDays, format, formatISO9075 } from "date-fns";
import { id } from "date-fns/locale";

const TEST_API_GROUP = "120363206916303221@g.us";

let startingTime = new Date();
const pb = new PocketBase("https://www.ctonline.cloud") as TypedPocketBase;

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

function RunMessageGeneration(client: Whatsapp) {
  const tommorow = formatISO9075(addDays(new Date(), 1));
  const today = formatISO9075(new Date());

  pb.collection(Collections.ClassSimple)
    .getList(1, 50, {
      filter: `tanggal <= "${tommorow}" && tanggal >= "${today}"`,
    })
    .then((fetchResult) => {
      if (fetchResult.items.length === 0) {
        console.log("no class tommorow");
        return;
      }

      const needReminder = fetchResult.items.filter((item) => !item.reminder);

      client
        .sendText(TEST_API_GROUP, CreateReminderMessage(needReminder))
        .then(() => {
          // Update reminder column in database
          needReminder.forEach((item) => {
            pb.collection(Collections.ClassSimple)
              .update(item.id, {
                reminder: true,
              })
              .then(() => console.log("Reminder sent for ", item.materi));
          });
        });
    })
    .catch((error) =>
      console.log(`Error fetching ClassSimple, cause: ${error}`)
    );
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
