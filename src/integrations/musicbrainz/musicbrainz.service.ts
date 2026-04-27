import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Track } from '../../api/schemas/record.schema';

type MusicBrainzTrack = {
  position?: string;
  title?: string;
  recording?: {
    title?: string;
  };
};

type MusicBrainzMedium = {
  tracks?: MusicBrainzTrack[];
};

type MusicBrainzRelease = {
  media?: MusicBrainzMedium[];
};

@Injectable()
export class MusicBrainzService {
  constructor(private readonly configService: ConfigService) {}

  async getReleaseTracklist(mbid: string): Promise<Track[]> {
    const baseUrl = this.configService.get<string>(
      'musicBrainz.baseUrl',
      'https://musicbrainz.org/ws/2',
    );
    const timeoutMs = this.configService.get<number>(
      'musicBrainz.timeoutMs',
      5000,
    );
    const url = new URL(`release/${encodeURIComponent(mbid)}`, `${baseUrl}/`);
    url.searchParams.set('inc', 'recordings');
    url.searchParams.set('fmt', 'json');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'nestjs-hostelworld-challenge/1.0',
        },
      });

      if (response.status === 404) {
        throw new NotFoundException('MusicBrainz release not found');
      }

      if (!response.ok) {
        throw new BadGatewayException('MusicBrainz request failed');
      }

      const release = (await response.json()) as MusicBrainzRelease;

      return (release.media ?? [])
        .flatMap((medium) => medium.tracks ?? [])
        .map((track) => ({
          position: track.position ?? '',
          title: track.title ?? track.recording?.title ?? '',
        }))
        .filter((track) => track.position && track.title);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new RequestTimeoutException('MusicBrainz request timed out');
      }

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('MusicBrainz request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}
