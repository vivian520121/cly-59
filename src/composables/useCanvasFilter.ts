import { ref, computed, reactive } from 'vue';
import { CanvasFilterService, FilterType, FilterOptions, ColorShift } from '@/services/CanvasFilterService';
export interface UseCanvasFilterOptions {
 previewMaxWidth?: number;
 previewMaxHeight?: number;
 outputQuality?: number;
 outputType?: string;
}
export interface FilterProgress {
 current: number;
 total: number;
 stage: string;
 percent: number;
}
export function useCanvasFilter(options: UseCanvasFilterOptions = {}) {
 const { previewMaxWidth = 800, previewMaxHeight = 800, outputQuality = 0.95, outputType = 'image/png' } = options;
 const filterType = ref<FilterType>('pressedFlower');
 const filterOptions = reactive<Partial<FilterOptions>>({
 intensity: 1,
 desaturation: undefined,
 brightness: undefined,
 contrast: undefined,
 noiseAmount: undefined,
 vignetteStrength: undefined,
 colorShift: undefined,
 blendOpacity: undefined
 });
 const sourceImage = ref<HTMLImageElement | null>(null);
 const sourceCanvas = ref<HTMLCanvasElement | null>(null);
 const previewCanvas = ref<HTMLCanvasElement | null>(null);
 const isProcessing = ref(false);
 const progress = reactive<FilterProgress>({
 current: 0,
 total: 0,
 stage: '',
 percent: 0
 });
 const error = ref<Error | null>(null);
 const hasImage = computed(() => sourceImage.value !== null);
 const defaultFilterConfigs: Record<FilterType, Partial<FilterOptions>> = {
 none: {},
 pressedFlower: {
 desaturation: 0.5,
 brightness: -0.05,
 contrast: 0,
 noiseAmount: 0.08,
 vignetteStrength: 0.3,
 colorShift: { r: -10, g: 5, b: -15 },
 blendOpacity: 0.6
 },
 agedPaper: {
 desaturation: 0.2,
 brightness: 0,
 contrast: -0.15,
 noiseAmount: 0.03,
 vignetteStrength: 0.2,
 colorShift: { r: 0, g: 0, b: 0 },
 blendOpacity: 0.6
 }
 };
 function updateProgress(current: number, total: number, stage: string): void {
 progress.current = current;
 progress.total = total;
 progress.stage = stage;
 progress.percent = total > 0 ? Math.round((current / total) * 100) : 0;
 }
 function getMergedOptions(): Partial<FilterOptions> {
 const defaults = defaultFilterConfigs[filterType.value];
 const merged: Partial<FilterOptions> = {};
 const keys = Object.keys(defaults) as Array<keyof FilterOptions>;
 for (const key of keys) {
 const userValue = filterOptions[key];
 if (userValue !== undefined && userValue !== null) {
 merged[key] = userValue as never;
 }
 else {
 merged[key] = defaults[key] as never;
 }
 }
 return merged;
 }
 async function loadImage(file: File | string): Promise<HTMLImageElement> {
 error.value = null;
 const url = typeof file === 'string' ? file : URL.createObjectURL(file);
 try {
 const img = await new Promise<HTMLImageElement>((resolve, reject) => {
 const image = new Image();
 image.crossOrigin = 'anonymous';
 image.onload = () => resolve(image);
 image.onerror = () => reject(new Error('Failed to load image'));
 image.src = url;
 });
 sourceImage.value = img;
 ensureSourceCanvas(img.width, img.height);
 return img;
 }
 catch (e) {
 error.value = e instanceof Error ? e : new Error('Unknown error loading image');
 throw error.value;
 }
 finally {
 if (typeof file !== 'string') {
 URL.revokeObjectURL(url);
 }
 }
 }
 function ensureSourceCanvas(width: number, height: number): void {
 if (!sourceCanvas.value) {
 sourceCanvas.value = document.createElement('canvas');
 }
 sourceCanvas.value.width = width;
 sourceCanvas.value.height = height;
 }
 function ensurePreviewCanvas(width: number, height: number): void {
 if (!previewCanvas.value) {
 previewCanvas.value = document.createElement('canvas');
 }
 const scale = Math.min(1, previewMaxWidth / width, previewMaxHeight / height);
 previewCanvas.value.width = Math.round(width * scale);
 previewCanvas.value.height = Math.round(height * scale);
 }
 function getSourceImageData(): ImageData {
 if (!sourceImage.value || !sourceCanvas.value) {
 throw new Error('No image loaded');
 }
 const ctx = sourceCanvas.value.getContext('2d')!;
 ctx.clearRect(0, 0, sourceCanvas.value.width, sourceCanvas.value.height);
 ctx.drawImage(sourceImage.value, 0, 0);
 return ctx.getImageData(0, 0, sourceCanvas.value.width, sourceCanvas.value.height);
 }
 function getEffectiveOptions(): Partial<FilterOptions> {
 const merged = getMergedOptions();
 if (merged.colorShift && filterOptions.colorShift) {
 merged.colorShift = { ...filterOptions.colorShift };
 }
 return merged;
 }
 async function applyFilterToData(imageData: ImageData, type?: FilterType): Promise<ImageData> {
 const filterToApply = type ?? filterType.value;
 const opts = getEffectiveOptions();
 const totalSteps = 6;
 let currentStep = 0;
 updateProgress(currentStep++, totalSteps, 'Preparing image data...');
 await nextFrame();
 updateProgress(currentStep++, totalSteps, 'Applying desaturation...');
 await nextFrame();
 updateProgress(currentStep++, totalSteps, 'Adjusting colors...');
 await nextFrame();
 updateProgress(currentStep++, totalSteps, 'Adding texture and noise...');
 await nextFrame();
 updateProgress(currentStep++, totalSteps, 'Applying vignette...');
 await nextFrame();
 const result = CanvasFilterService.applyFilter(imageData, filterToApply, opts);
 updateProgress(totalSteps, totalSteps, 'Complete');
 return result;
 }
 async function applyCurrentFilter(): Promise<ImageData> {
 if (!sourceImage.value) {
 throw new Error('No image loaded');
 }
 isProcessing.value = true;
 error.value = null;
 try {
 const imageData = getSourceImageData();
 return await applyFilterToData(imageData);
 }
 catch (e) {
 error.value = e instanceof Error ? e : new Error('Unknown error applying filter');
 throw error.value;
 }
 finally {
 isProcessing.value = false;
 }
 }
 async function updatePreview(): Promise<void> {
 if (!sourceImage.value) {
 return;
 }
 isProcessing.value = true;
 error.value = null;
 try {
 const { width, height } = sourceImage.value;
 ensurePreviewCanvas(width, height);
 const scale = previewCanvas.value!.width / width;
 const tempCanvas = document.createElement('canvas');
 tempCanvas.width = previewCanvas.value!.width;
 tempCanvas.height = previewCanvas.value!.height;
 const tempCtx = tempCanvas.getContext('2d')!;
 tempCtx.drawImage(sourceImage.value, 0, 0, tempCanvas.width, tempCanvas.height);
 const previewData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
 const filteredData = await applyFilterToData(previewData);
 const previewCtx = previewCanvas.value!.getContext('2d')!;
 previewCtx.clearRect(0, 0, previewCanvas.value!.width, previewCanvas.value!.height);
 previewCtx.putImageData(filteredData, 0, 0);
 }
 catch (e) {
 error.value = e instanceof Error ? e : new Error('Unknown error updating preview');
 }
 finally {
 isProcessing.value = false;
 }
 }
 async function getFilteredBlob(type?: FilterType, quality?: number): Promise<Blob> {
 if (!sourceImage.value) {
 throw new Error('No image loaded');
 }
 isProcessing.value = true;
 error.value = null;
 try {
 const imageData = getSourceImageData();
 const filteredData = type
 ? await applyFilterToData(imageData, type)
 : await applyFilterToData(imageData);
 const outputCanvas = document.createElement('canvas');
 outputCanvas.width = filteredData.width;
 outputCanvas.height = filteredData.height;
 const ctx = outputCanvas.getContext('2d')!;
 ctx.putImageData(filteredData, 0, 0);
 return new Promise((resolve, reject) => {
 outputCanvas.toBlob((blob) => {
 if (blob) {
 resolve(blob);
 }
 else {
 reject(new Error('Failed to create blob'));
 }
 }, outputType, quality ?? outputQuality);
 });
 }
 catch (e) {
 error.value = e instanceof Error ? e : new Error('Unknown error creating blob');
 throw error.value;
 }
 finally {
 isProcessing.value = false;
 }
 }
 async function getFilteredDataURL(type?: FilterType, quality?: number): Promise<string> {
 const blob = await getFilteredBlob(type, quality);
 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = () => reject(reader.error);
 reader.readAsDataURL(blob);
 });
 }
 function setFilterType(type: FilterType): void {
 filterType.value = type;
 }
 function setIntensity(value: number): void {
 filterOptions.intensity = Math.max(0, Math.min(1, value));
 }
 function setDesaturation(value: number): void {
 filterOptions.desaturation = Math.max(0, Math.min(1, value));
 }
 function setBrightness(value: number): void {
 filterOptions.brightness = Math.max(-1, Math.min(1, value));
 }
 function setContrast(value: number): void {
 filterOptions.contrast = Math.max(-1, Math.min(1, value));
 }
 function setNoiseAmount(value: number): void {
 filterOptions.noiseAmount = Math.max(0, Math.min(1, value));
 }
 function setVignetteStrength(value: number): void {
 filterOptions.vignetteStrength = Math.max(0, Math.min(1, value));
 }
 function setColorShift(shift: Partial<ColorShift>): void {
 if (!filterOptions.colorShift) {
 filterOptions.colorShift = { r: 0, g: 0, b: 0 };
 }
 filterOptions.colorShift = {
 ...filterOptions.colorShift,
 ...shift
 };
 }
 function setBlendOpacity(value: number): void {
 filterOptions.blendOpacity = Math.max(0, Math.min(1, value));
 }
 function resetFilterOptions(): void {
 filterOptions.intensity = 1;
 filterOptions.desaturation = undefined;
 filterOptions.brightness = undefined;
 filterOptions.contrast = undefined;
 filterOptions.noiseAmount = undefined;
 filterOptions.vignetteStrength = undefined;
 filterOptions.colorShift = undefined;
 filterOptions.blendOpacity = undefined;
 }
 function resetAll(): void {
 resetFilterOptions();
 filterType.value = 'pressedFlower';
 sourceImage.value = null;
 sourceCanvas.value = null;
 previewCanvas.value = null;
 error.value = null;
 isProcessing.value = false;
 updateProgress(0, 0, '');
 }
 function nextFrame(): Promise<void> {
 return new Promise(resolve => requestAnimationFrame(() => resolve()));
 }
 return {
 filterType,
 filterOptions,
 sourceImage,
 sourceCanvas,
 previewCanvas,
 isProcessing,
 progress,
 error,
 hasImage,
 loadImage,
 applyCurrentFilter,
 updatePreview,
 getFilteredBlob,
 getFilteredDataURL,
 setFilterType,
 setIntensity,
 setDesaturation,
 setBrightness,
 setContrast,
 setNoiseAmount,
 setVignetteStrength,
 setColorShift,
 setBlendOpacity,
 resetFilterOptions,
 resetAll,
 getEffectiveOptions
 };
}
export type UseCanvasFilterReturn = ReturnType<typeof useCanvasFilter>;

