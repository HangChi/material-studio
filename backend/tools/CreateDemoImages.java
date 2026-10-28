import java.awt.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.nio.file.*;

// Original geometric sample artwork, generated locally; no external assets or fonts.
public class CreateDemoImages {
    public static void main(String[] args) throws Exception {
        Path out = Path.of("src/main/resources/demo"); Files.createDirectories(out);
        for (String name : new String[]{"portrait", "postcard", "collage"}) {
            BufferedImage image = new BufferedImage(960, 720, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(new Color(223, 235, 252)); g.fillRect(0, 0, 960, 720);
            if (name.equals("portrait")) {
                g.setColor(new Color(245, 206, 116)); g.fillOval(430, -160, 650, 650);
                g.setColor(new Color(85, 126, 171)); g.fillRoundRect(180, 100, 510, 680, 240, 240);
                g.setColor(new Color(232, 174, 142)); g.fillOval(322, 168, 235, 275);
                g.setColor(new Color(29, 52, 74)); g.fillArc(314, 130, 255, 280, 0, 180);
                g.setColor(new Color(248, 246, 235)); g.fillRoundRect(260, 415, 370, 410, 170, 170);
                g.setColor(new Color(245, 206, 116)); g.fillOval(75, 530, 70, 70);
            } else if (name.equals("postcard")) {
                g.setColor(new Color(251, 249, 240)); g.fillRect(70, 75, 820, 570);
                g.setColor(new Color(161, 207, 227)); g.fillRect(105, 110, 750, 340);
                g.setColor(new Color(250, 205, 117)); g.fillOval(635, 135, 120, 120);
                g.setColor(new Color(75, 122, 131)); g.fillPolygon(new int[]{105, 370, 630, 855}, new int[]{450, 215, 450, 450}, 4);
                g.setColor(new Color(35, 80, 99)); g.fillPolygon(new int[]{400, 660, 855}, new int[]{450, 285, 450}, 3);
                g.setColor(new Color(196, 206, 210)); g.fillRect(125, 505, 410, 12); g.fillRect(125, 545, 290, 12);
                g.setColor(new Color(39, 93, 206)); g.drawRect(750, 500, 75, 90);
            } else {
                g.setColor(new Color(39, 93, 206)); g.fillRect(0, 0, 960, 720);
                g.rotate(-0.10, 480, 360);
                int[] xs = {70, 360, 650}; int[] ys = {150, 230, 120};
                Color[] colors = {new Color(245, 192, 117), new Color(160, 204, 184), new Color(174, 199, 240)};
                for (int i = 0; i < 3; i++) {
                    g.setColor(Color.WHITE); g.fillRect(xs[i], ys[i], 245, 340);
                    g.setColor(colors[i]); g.fillRect(xs[i]+15, ys[i]+15, 215, 255);
                    g.setColor(new Color(49, 92, 105)); g.fillOval(xs[i]+65, ys[i]+90, 125, 125);
                }
            }
            g.dispose(); ImageIO.write(image, "png", out.resolve(name + ".png").toFile());
        }
    }
}
