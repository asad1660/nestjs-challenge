import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MusicBrainzService } from './musicbrainz.service';

describe('MusicBrainzService', () => {
  let service: MusicBrainzService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    service = new MusicBrainzService({
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    } as unknown as ConfigService);
  });

  it('maps MusicBrainz release tracks', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        media: [
          {
            tracks: [
              { position: '1', title: 'First Track' },
              { position: '2', recording: { title: 'Second Track' } },
            ],
          },
        ],
      }),
    });

    await expect(service.getReleaseTracklist('release-id')).resolves.toEqual([
      { position: '1', title: 'First Track' },
      { position: '2', title: 'Second Track' },
    ]);
  });

  it('maps 404 responses to not found', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(service.getReleaseTracklist('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps upstream failures to bad gateway', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.getReleaseTracklist('broken')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
