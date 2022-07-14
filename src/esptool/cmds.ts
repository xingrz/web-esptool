export enum Command {
  // Commands supported by ESP8266 ROM bootloader
  ESP_FLASH_BEGIN = 0x02,
  ESP_FLASH_DATA = 0x03,
  ESP_FLASH_END = 0x04,

  ESP_MEM_BEGIN = 0x05,
  ESP_MEM_END = 0x06,
  ESP_MEM_DATA = 0x07,

  ESP_SYNC = 0x08,

  ESP_WRITE_REG = 0x09,
  ESP_READ_REG = 0x0A,

  ESP_FLASH_DEFL_BEGIN = 0x10,
  ESP_FLASH_DEFL_DATA = 0x11,
  ESP_FLASH_DEFL_END = 0x12,

  ESP_SPI_FLASH_MD5 = 0x13,

  // Some comands supported by ESP32 ROM bootloader(or -8266 w / stub)
  ESP_CHANGE_BAUDRATE = 0x0F,


  // Commands supported by ESP32-S2 and later chips ROM bootloader only
  ESP_GET_SECURITY_INFO = 0x14,

  // Some commands supported by stub only
  ESP_ERASE_FLASH = 0xD0,
  ESP_ERASE_REGION = 0xD1,
  ESP_READ_FLASH = 0xD2,
};
