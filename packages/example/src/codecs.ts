import { z } from "zod";

export const stringToDate = z.codec(
    z.iso.datetime(),
    z.date(),
    {
      decode: (isoString) => new Date(isoString),
      encode: (date) => date.toISOString(),
    }
  );
  