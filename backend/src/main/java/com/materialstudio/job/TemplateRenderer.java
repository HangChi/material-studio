package com.materialstudio.job;
import com.materialstudio.asset.AssetService;
import org.springframework.stereotype.Service;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.List;
import javax.imageio.ImageIO;
@Service
public class TemplateRenderer {
 private final AssetService assets;
 public TemplateRenderer(AssetService assets){this.assets=assets;}
 public BufferedImage render(String template,String owner,List<String> ids) throws IOException {
  boolean portrait=template.equals("demo-portrait");int width=portrait?1000:1200,height=portrait?1200:900;
  var image=new BufferedImage(width,height,BufferedImage.TYPE_INT_RGB);var g=image.createGraphics();
  try{
   g.setColor(new Color(portrait?0xf4e9ce:0x3454a5));g.fillRect(0,0,width,height);g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
   for(int i=0;i<ids.size();i++){
    var row=assets.owned(ids.get(i),owner);assets.ensureAvailable(row);var source=ImageIO.read(assets.path(row).toFile());if(source==null)throw new IOException("Invalid source");
    try{
     int x=portrait?80:60+i*380,y=portrait?80:90+(i%2)*60,w=portrait?840:320,h=portrait?900:580;
     g.setColor(Color.WHITE);g.fillRect(x-12,y-12,w+24,h+70);
     double scale=Math.max((double)w/source.getWidth(),(double)h/source.getHeight());var clipped=(Graphics2D)g.create();
     try{clipped.clipRect(x,y,w,h);var transform=new java.awt.geom.AffineTransform();transform.translate(x-(source.getWidth()*scale-w)/2,y-(source.getHeight()*scale-h)/2);transform.scale(scale,scale);clipped.drawImage(source,transform,null);}finally{clipped.dispose();}
    }finally{source.flush();}
   }
   g.setColor(portrait?new Color(0x523a2c):Color.WHITE);g.setFont(new Font("WenQuanYi Zen Hei",Font.PLAIN,40));g.drawString(portrait?"日光里的你":"把周末，留在这一页",60,height-65);return image;
  }catch(IOException|RuntimeException e){image.flush();throw e;}finally{g.dispose();}
 }
}
