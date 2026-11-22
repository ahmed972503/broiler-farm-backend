require("dotenv").config({ path: "./apps/api/.env" });
const { initNeonDatabase, NeonShedRepository } = require("./apps/api/dist/config/postgres");

async function main() {
  try {
    const sheds = await NeonShedRepository.findAll();
    console.log("NeonShedRepository.findAll() returned:", sheds.length, "sheds");
    console.log(sheds);
  } catch(e) {
    console.error("Error calling findAll:", e);
  }
}
main();
