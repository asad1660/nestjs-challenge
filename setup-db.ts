import * as mongoose from 'mongoose';
import { Record, RecordSchema } from './src/api/schemas/record.schema';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

function dedupeSeedRecords(records: Record[]) {
  const seen = new Set<string>();

  return records.filter((record) => {
    const key = `${record.artist}::${record.album}::${record.format}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function deleteExistingDuplicates(recordModel: mongoose.Model<Record>) {
  const duplicateGroups = await recordModel.aggregate<{
    ids: mongoose.Types.ObjectId[];
  }>([
    {
      $group: {
        _id: { artist: '$artist', album: '$album', format: '$format' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const group of duplicateGroups) {
    await recordModel.deleteMany({ _id: { $in: group.ids.slice(1) } });
  }
}

async function setupDatabase() {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL is required to set up the database');
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      'Do you want to clean up the existing records collection? (Y/N): ',
      async (answer) => {
        rl.close();

        const data = dedupeSeedRecords(
          JSON.parse(fs.readFileSync('data.json', 'utf-8')),
        );
        const recordModel: mongoose.Model<Record> = mongoose.model<Record>(
          'Record',
          RecordSchema,
        );

        await mongoose.connect(process.env.MONGO_URL);

        if (answer.toLowerCase() === 'y') {
          await recordModel.deleteMany({});
          console.log('Existing collection cleaned up.');
        } else {
          await deleteExistingDuplicates(recordModel);
          console.log('Existing duplicate logical records cleaned up.');
        }

        await recordModel.syncIndexes();

        const records = await recordModel.insertMany(data);
        console.log(`Inserted ${records.length} records successfully!`);

        mongoose.disconnect();
      },
    );
  } catch (error) {
    console.error('Error setting up the database:', error);
    mongoose.disconnect();
  }
}

setupDatabase();
