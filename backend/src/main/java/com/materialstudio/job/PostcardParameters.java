package com.materialstudio.job;

import com.materialstudio.common.ApiException;
import java.util.List;

public record PostcardParameters(String title,Palette palette,Format format,List<Crop> crops) {
    public enum Palette { CREAM, OCEAN }
    public enum Format { LANDSCAPE, SQUARE }
    public record Crop(Double x,Double y,Double zoom) {
        boolean valid() { return finite(x,0,1)&&finite(y,0,1)&&finite(zoom,1,3); }
        private boolean finite(Double value,double min,double max) { return value!=null&&Double.isFinite(value)&&value>=min&&value<=max; }
    }
    public static PostcardParameters defaults() {
        return new PostcardParameters("旅途来信",Palette.CREAM,Format.LANDSCAPE,List.of(new Crop(0.5,0.5,1.0),new Crop(0.5,0.5,1.0)));
    }
    public PostcardParameters validate() {
        if(title==null||title.codePointCount(0,title.length())>40||title.codePoints().anyMatch(Character::isISOControl)
                ||palette==null||format==null||crops==null||crops.size()!=2||crops.stream().anyMatch(c->c==null||!c.valid()))
            throw new ApiException(422,"INVALID_PARAMETERS","请填写不超过40字的单行标题、配色、比例及两张图片的有效裁剪参数");
        return this;
    }
}
