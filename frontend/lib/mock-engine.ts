export type WardId = string;

export type WardReading = {
  ward: string;

  rainfallMm: number;

  riverLevelCm: number;

  reportCount: number;
};


export type MockSnapshot = {
  timestamp: number;

  wards: WardReading[];
};


const WARD_COUNT =
  67;


let wards:
  WardReading[] =
  Array.from(
    {
      length:
        WARD_COUNT,
    },
    (
      _,
      index
    ) => {

      const wardNumber =
        index +
        1;


      return {

        ward:
          `W${wardNumber}`,

        rainfallMm:
          randomInteger(
            5,
            45
          ),

        riverLevelCm:
          randomInteger(
            5,
            40
          ),

        reportCount:
          randomInteger(
            0,
            3
          ),

      };

    }
  );


/* -------------------------------------------------------------------------- */
/* DEMO CONDITIONS                                                            */
/* -------------------------------------------------------------------------- */

setWardValues(
  "W14",
  {
    rainfallMm:
      38,

    riverLevelCm:
      42,

    reportCount:
      2,
  }
);


setWardValues(
  "W38",
  {
    rainfallMm:
      30,

    riverLevelCm:
      35,

    reportCount:
      1,
  }
);


setWardValues(
  "W22",
  {
    rainfallMm:
      25,

    riverLevelCm:
      31,

    reportCount:
      1,
  }
);


/* -------------------------------------------------------------------------- */
/* GET SNAPSHOT                                                               */
/* -------------------------------------------------------------------------- */

export function getSnapshot():
  MockSnapshot {

  return {

    timestamp:
      Date.now(),

    wards:
      wards.map(
        (
          ward
        ) => ({
          ...ward,
        })
      ),

  };

}


/* -------------------------------------------------------------------------- */
/* TICK ENGINE                                                                */
/* -------------------------------------------------------------------------- */

export function tickEngine():
  MockSnapshot {

  wards =
    wards.map(
      (
        ward
      ) => ({

        ...ward,

        rainfallMm:
          clamp(
            ward.rainfallMm +
            randomInteger(
              -3,
              3
            ),
            0,
            150
          ),

        riverLevelCm:
          clamp(
            ward.riverLevelCm +
            randomInteger(
              -2,
              2
            ),
            0,
            120
          ),

      })
    );


  return getSnapshot();

}


/* -------------------------------------------------------------------------- */
/* UPDATE ONE WARD                                                            */
/* -------------------------------------------------------------------------- */

export function updateWard(
  wardId:
    WardId,

  update:
    Partial<
      Omit<
        WardReading,
        "ward"
      >
    >
):
  WardReading | null {

  const index =
    wards.findIndex(
      (
        ward
      ) =>
        ward.ward ===
        wardId
    );


  if (
    index ===
    -1
  ) {

    return null;

  }


  wards[
    index
  ] = {

    ...wards[
      index
    ],

    ...update,

  };


  return {
    ...wards[
      index
    ],
  };

}


/* -------------------------------------------------------------------------- */
/* SET VALUES                                                                 */
/* -------------------------------------------------------------------------- */

function setWardValues(
  wardId:
    WardId,

  values:
    Partial<
      Omit<
        WardReading,
        "ward"
      >
    >
) {

  const index =
    wards.findIndex(
      (
        ward
      ) =>
        ward.ward ===
        wardId
    );


  if (
    index ===
    -1
  ) {

    return;

  }


  wards[
    index
  ] = {

    ...wards[
      index
    ],

    ...values,

  };

}


/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function randomInteger(
  minimum:
    number,

  maximum:
    number
) {

  return Math.floor(
    Math.random() *
    (
      maximum -
      minimum +
      1
    )
  ) +
    minimum;

}


function clamp(
  value:
    number,

  minimum:
    number,

  maximum:
    number
) {

  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );

}