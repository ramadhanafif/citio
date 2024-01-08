import { addDays, format } from "date-fns";
import { ClassSimpleResponse } from "src/pocketbase-types.js";
import { id } from "date-fns/locale";

export default class MultiLineMessage extends Array<string> {
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

export function CreateReminderMessage(classData: ClassSimpleResponse[]) {
  const msg = new MultiLineMessage();
  const currentDate = format(addDays(new Date(), 1), "PPPP", { locale: id });

  // Header
  msg.addMessage("*PENGINGAT JADWAL CITIO*");
  msg.addMessage(`Untuk ${currentDate.toUpperCase()}`);
  msg.addMessage("");

  // Body
  classData.forEach((item) => {
    msg.addMessage(`Materi: ${item.materi}`);
    msg.addMessage(`Kelas : ${item.kelas}`);
    msg.addMessage(`Pemateri : ${item.pemateri}`);
    msg.addMessage(`Pendamping: ${item.pendamping}`);
    msg.addMessage("Pukul 05.00 WIB");
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
