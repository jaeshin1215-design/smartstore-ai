import { Client, GatewayIntentBits, Events } from "discord.js";
import fs from "fs";

const TOKEN = "MTUwOTg4NDQyNjUyNjM5NjQ2Ng.G0NQ26.mNUp1PdS5M7MgtXrJngd4y_tVy83WDRdyn9rWw";
const REPORT_FILE = "./scratch/report_to_wendy_mezzanine.md";

const TARGET_CHANNEL_NAMES = [
  "claude-tom-jae-wendy",
  "tom-jae-wendy",
  "wendy",
  "클로드-tom-jae-wendy",
  "claude-wendy",
];

if (!fs.existsSync(REPORT_FILE)) {
  console.error("❌ 보고서 파일 없음:", REPORT_FILE);
  process.exit(1);
}

const reportText = fs.readFileSync(REPORT_FILE, "utf-8");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`📡 로그인 완료: ${c.user.tag}`);

  try {
    let targetChannel = null;
    let foundName = "";

    const guilds = await c.guilds.fetch();
    for (const [, oGuild] of guilds) {
      const guild = await oGuild.fetch();
      const channels = await guild.channels.fetch();

      console.log("📋 채널 목록:");
      for (const [, ch] of channels) {
        if (ch?.isTextBased()) console.log(`  - ${ch.name}`);
      }

      for (const name of TARGET_CHANNEL_NAMES) {
        for (const [, channel] of channels) {
          if (channel?.name === name && channel.isTextBased()) {
            targetChannel = channel;
            foundName = name;
            break;
          }
        }
        if (targetChannel) break;
      }
      if (targetChannel) break;
    }

    if (!targetChannel) {
      console.error("❌ 대상 채널을 찾지 못했습니다. 위 채널 목록을 확인해주세요.");
      client.destroy();
      process.exit(1);
    }

    console.log(`✅ 채널 발견: #${foundName}`);
    console.log("🚀 Wendy에게 메자닌 현황 보고 전송 중...");

    const LIMIT = 1800;
    for (let i = 0; i < reportText.length; i += LIMIT) {
      await targetChannel.send(reportText.slice(i, i + LIMIT));
      await new Promise(r => setTimeout(r, 500));
    }

    console.log("🎉 전송 완료!");
  } catch (err) {
    console.error("❌ 전송 실패:", err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);
