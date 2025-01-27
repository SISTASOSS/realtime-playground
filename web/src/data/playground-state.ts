import { TurnDetectionTypeId } from "@/data/turn-end-types";
import { ModalitiesId } from "@/data/modalities";
import { VoiceId } from "@/data/voices";
import { Preset } from "./presets";
import { ModelId } from "./models";
import { Transcription } from "@/hooks/use-agent";
import { TranscriptionModelId } from "./transcription-models";

export interface SessionConfig {
  model: ModelId;
  transcriptionModel: TranscriptionModelId;
  turnDetection: TurnDetectionTypeId;
  modalities: ModalitiesId;
  voice: VoiceId;
  temperature: number;
  maxOutputTokens: number | null;
  vadThreshold: number;
  vadSilenceDurationMs: number;
  vadPrefixPaddingMs: number;
}

export interface PlaygroundState {
  sessionConfig: SessionConfig;
  userPresets: Preset[];
  selectedPresetId: string | null;
  openaiAPIKey: string | null | undefined;
  instructions: string;
  instructionsSummary: string;
  instructionsAgent: string;
  summary?: string;
  displayTranscriptions?: Transcription[];
  jwtToken?: string | null;
}

export const defaultSessionConfig: SessionConfig = {
  model: ModelId.gpt_4o_realtime,
  transcriptionModel: TranscriptionModelId.whisper1,
  turnDetection: TurnDetectionTypeId.server_vad,
  modalities: ModalitiesId.text_and_audio,
  voice: VoiceId.alloy,
  temperature: 0.8,
  maxOutputTokens: null,
  vadThreshold: 0.5,
  vadSilenceDurationMs: 200,
  vadPrefixPaddingMs: 300,
};

// Define the initial state
export const defaultPlaygroundState: PlaygroundState = {
  sessionConfig: { ...defaultSessionConfig },
  userPresets: [],
  selectedPresetId: "helpful-ai",
  openaiAPIKey: undefined,
  instructions:
    "",
    // "Sen, ürün ve hizmet satın alma konusunda temkinli, sorgulayıcı ve pazarlık yapmayı seven bir müşterisin. Seni bir satış temsilcisi arayacak ve Telemarketing temsilcilerinin ikna kabiliyetini, çağrı yönetimini test etmek ve geliştirmek amacıyla çalışıyorsun. Aşağıdaki kurallara göre müşteri görüşmesi yap. \n" +
    //   "1. İhtiyaç Belirsizliği: İlk etapta ürün veya hizmetin sana fayda sağlayıp sağlamayacağı konusunda şüpheci ol. 'Buna gerçekten ihtiyacım var mı?' gibi sorular sorarak temsilcinin açıklamalar yapmasını sağla.\n" +
    //   "2. Pazarlık: Fiyat konusunda memnuniyetsiz olduğunu ifade et ve daha uygun bir teklif veya ek avantaj talep et. Örneğin, 'Bu fiyat bana fazla geliyor, indirim yapabiliyor musunuz?' veya 'Başka bir firma daha iyi bir teklif sundu' gibi ifadeler kullan.\n" +
    //   "3. Rakiplerle Kıyaslama: Ürün/hizmet hakkında rekabetçi bir pazar olduğunu ima et. Temsilcinin, ürünün neden farklı ve üstün olduğunu açıklamasını sağla.\n" +
    //   "4. Soru Sorma: Sürekli sorular sorarak temsilciyi zorlama. Örneğin:\n" +
    //   "'Bu ürün/hizmet tam olarak nasıl çalışıyor?'\n" +
    //   "‘Kullanım süresi nedir?'\n" +
    //   "'İade politikası nasıl işliyor?'\n" +
    //   "'Bu fiyatın içinde başka ne var ve ilave burada bahsedilmeyen sonradan yansıyacak ücretler var mı?'\n" +
    //   "5. Kararsızlık: Satın alma kararını vermekte zorlanan bir müşteri gibi davran. Örneğin, 'Biraz daha düşüneyim' veya 'Bu konuda eşimle/ortaklarımla konuşmam lazım' gibi ifadeler kullan.\n" +
    //   "6. Sonuç Odaklılık: Temsilci etkili bir şekilde sana fayda, çözüm ve değer sunduğunda yavaş yavaş ikna olmaya başla. Ancak, ikna olmak için onların çabalarını sonuna kadar değerlendir.\"\n" +
    //   "Amaç: Temsilcilerin ürün bilgilerini, müşteri ihtiyaçlarını anlama kabiliyetlerini, ikna yeteneklerini ve pazarlık yapma becerilerini geliştirmek. Konuşma sırasında, temsilcinin açık ve samimi bir şekilde ikna etme çabalarını değerlendir ve geri bildirim ver. \n" +
    //   "7- Aynı soruyu ikiden fazla sorma\n" +
    //   "8- Sadece türkçe konuş, ve temsilci seninle sadece türkçe konuşacak (temsilci azda olsa araya ingilizce kelime koyabilir):\n" +
    //   "9- Unutma Seni telefon ile arıyorlar, bu sebepten dolayı, ilk çümlen sadece \"Alo, Merhaba, nasıl yardımcı olabilirim\" olsun. \n" +
    //   "10- Telefon ile arandın, toplamda 6 dakika vaktin var, evdesin ve dışarıya çıkacaksın",
  instructionsSummary:
    "",
    // "Aşağıdaki yazıda Müşteri (Bot) ile satış yapmaya çalışan temsilci (Human) arasındaki konuşma yer almaktadır. \n" +
    //   "Bu konuşmayı temsilciyinin satış yapma becerilerini değerlendirerek özetleyebilir misin? (Sadece Türkçe).\n"+
    //   "Aşağıdaki sorulara göre temsilcisini değerlendir: \n"+
    //   "- Temsilci kibar konuştu mu?\n" +
    //   "- Temsilcinin yeterli bilgisi var mıydı?\n" +
    //   "- İkna becerileri iyi miydi?\n" +
    //   "- Müşteriyi sıktı mı? \n" +
    //   "- Müşteri ikna oldu mu?",
  instructionsAgent:
    "",
  // "Müşteri künyesi: \n" +
  //   "İsim Soyisim: Deniz Yıldız \n" +
  //   "Gecikme gün sayısı: 31 \n" +
  //   "Gecikmeli ürünleri: Kredi Kartı, KMH, ihtiyaç kredisi \n" +
  //   "Gecikmeli ürünleri toplam tutarı: 500,000 TL \n",
  jwtToken: null
};
