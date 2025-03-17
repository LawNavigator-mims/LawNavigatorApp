import {
  type PipelineType,
  pipeline,
  ProgressCallback,
} from "@huggingface/transformers";

export default class EmbeddingsPipeline {
  static task: PipelineType = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

  static async getInstance(progress_callback?: ProgressCallback) {
    if (this.instance === null) {
      // Load model dynamically from Hugging Face instead of bundling it
      this.instance = await pipeline(this.task, this.model, {
        progress_callback,
      });
    }

    return this.instance;
  }
}
