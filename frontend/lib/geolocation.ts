export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    /*
     * Check whether the browser supports
     * the Geolocation API.
     */
    if (!navigator.geolocation) {
      reject(
        new Error(
          "Geolocation is not supported by this browser."
        )
      );

      return;
    }

    /*
     * Request the citizen's current position.
     */
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },

      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                "Location permission was denied."
              )
            );
            break;

          case error.POSITION_UNAVAILABLE:
            reject(
              new Error(
                "Your current location could not be determined."
              )
            );
            break;

          case error.TIMEOUT:
            reject(
              new Error(
                "Location detection timed out."
              )
            );
            break;

          default:
            reject(
              new Error(
                "Unable to detect your current location."
              )
            );
        }
      },

      {
        /*
         * Better GPS accuracy where the
         * device/browser supports it.
         */
        enableHighAccuracy: true,

        /*
         * Don't wait forever for GPS.
         */
        timeout: 10000,

        /*
         * Accept a recently cached location
         * for faster emergency access.
         */
        maximumAge: 30000,
      }
    );
  });
}