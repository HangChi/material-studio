package com.materialstudio.job;

import com.materialstudio.asset.AssetService;
import org.springframework.stereotype.Service;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.List;

@Service
public class PostcardRenderer {
    private final AssetService assets;
    public PostcardRenderer(AssetService assets) { this.assets=assets; }
    public BufferedImage render(String owner,List<String> ids,PostcardParameters parameters) throws IOException {
        var p=parameters.validate();
        int width=p.format()==PostcardParameters.Format.LANDSCAPE?1200:1000,height=p.format()==PostcardParameters.Format.LANDSCAPE?800:1000;
        var image=new BufferedImage(width,height,BufferedImage.TYPE_INT_RGB);var g=image.createGraphics();
        try {
            boolean ocean=p.palette()==PostcardParameters.Palette.OCEAN;
            g.setColor(new Color(ocean?0xe7f2f5:0xf5efdf));g.fillRect(0,0,width,height);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
            for(int i=0;i<2;i++) {
                var row=assets.owned(ids.get(i),owner);assets.ensureAvailable(row);
                BufferedImage source=ImageIO.read(assets.path(row).toFile());if(source==null)throw new IOException("Invalid source image");
                try {
                    int x=(int)(width*(i==0?0.06:0.52)),y=(int)(height*0.12),w=(int)(width*0.42),h=(int)(height*0.62);
                    var crop=p.crops().get(i);double scale=Math.max((double)w/source.getWidth(),(double)h/source.getHeight())*crop.zoom();
                    double sw=source.getWidth()*scale,sh=source.getHeight()*scale;
                    var clipped=(Graphics2D)g.create();
                    try {
                        clipped.clipRect(x,y,w,h);
                        var transform=new java.awt.geom.AffineTransform();transform.translate(x-(sw-w)*crop.x(),y-(sh-h)*crop.y());transform.scale(scale,scale);
                        clipped.drawImage(source,transform,null);
                    } finally { clipped.dispose(); }
                } finally { source.flush(); }
            }
            g.setColor(new Color(ocean?0x174a5b:0x523a2c));
            g.fillRect((int)(width*0.06),(int)(height*0.07),(int)(width*0.12),3);
            Font titleFont=new Font("WenQuanYi Zen Hei",Font.PLAIN,(int)(height*0.055));
            while(titleFont.getSize()>12&&g.getFontMetrics(titleFont).stringWidth(p.title())>width*0.88)titleFont=titleFont.deriveFont((float)(titleFont.getSize()-1));
            g.setFont(titleFont);g.drawString(p.title(),(int)(width*0.06),(int)(height*0.87));
            g.setFont(new Font(Font.SANS_SERIF,Font.PLAIN,(int)(height*0.0175)));g.drawString("POSTCARD / MATERIAL STUDIO",(int)(width*0.06),(int)(height*0.93));
            return image;
        } catch(IOException|RuntimeException e) { image.flush();throw e; }
        finally { g.dispose(); }
    }
}
