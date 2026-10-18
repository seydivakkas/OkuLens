# Üçüncü taraf model ve runtime bileşenleri — İşlem 004

| Bileşen | Kullanım | Lisans / kaynak | Paket durumu |
| --- | --- | --- | --- |
| Qwen3-0.6B-Instruct-ONNX | Tarayıcı içi Türkçe üretken çıkarım için isteğe bağlı model | Apache-2.0; https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX | GitHub'a eklenmedi; kullanıcı onaylı CLI ile indirilir |
| @huggingface/transformers 3.8.1 | Yerel ONNX pipeline, tokenizer, TextStreamer | Apache-2.0; https://github.com/huggingface/transformers.js | npm kurulumu ve build ile paketlenir |
| ONNX Runtime Web | WebGPU/WASM yürütme | MIT; https://github.com/microsoft/onnxruntime | Transformers.js npm bağımlılığından runtime build sırasında paketlenir |
| Mozilla Readability 0.6.0 | Kaynak makale çıkarımı | Apache-2.0; vendor/readability/LICENSE.md | Halihazırda depoda |

P4'te kullanılan ONNX dosyası kaynağı sabit revizyondan alınır:
54250909aca286a05b9d013c8af7a21859ee6ead

- WebGPU q4f16: SHA256 `4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d`.
- WASM q4: SHA256 `a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d`.

Bu değerler kaynak model yükleme kayıtlarında yayınlanan dosya hashleridir; **model dosyalarının bu oturumda indirilip doğrulandığı iddiası değildir**. Kurulum betiği dosyayı indirdiğinde gerçek SHA'yı karşılaştırır ve yerel manifest üretir. Büyük dosya ve derlenmiş runtime GitHub'da yoktur.

Ürünün kendi kodu MIT lisanslıdır; üçüncü taraf model/kütüphaneler kendi lisanslarına tabidir. Yeniden dağıtım öncesi tüm lisans metinleri ve model kartı doğrulanmalıdır.
