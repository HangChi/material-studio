-- Only built-in catalog copy changes; template configuration and user data stay intact.
UPDATE template SET description = '为一张照片添加色块背景和相框。'
WHERE id = 'demo-portrait';
UPDATE template SET description = '将两张照片组合成明信片，可调整标题、配色和裁剪。'
WHERE id = 'demo-postcard';
UPDATE template SET description = '将三张照片按顺序拼成一张图片。'
WHERE id = 'demo-collage';
