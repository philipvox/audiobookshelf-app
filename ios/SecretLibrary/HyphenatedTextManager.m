/**
 * HyphenatedTextManager.m
 *
 * Native iOS component for text with hyphenation support.
 * Uses NSParagraphStyle.hyphenationFactor for proper text justification.
 */

#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import <UIKit/UIKit.h>

@interface HyphenatedTextView : UILabel
@property (nonatomic, copy) NSString *text;
@property (nonatomic, strong) UIColor *textColor;
@property (nonatomic, strong) UIFont *font;
@property (nonatomic, assign) CGFloat hyphenationFactor;
@property (nonatomic, assign) NSTextAlignment textAlignment;
@property (nonatomic, assign) CGFloat lineHeight;
@end

@implementation HyphenatedTextView

- (instancetype)init {
    self = [super init];
    if (self) {
        self.numberOfLines = 0;
        self.hyphenationFactor = 1.0;
        self.textAlignment = NSTextAlignmentJustified;
        self.lineHeight = 22.0;
    }
    return self;
}

- (void)updateAttributedText {
    if (!self.text) return;

    NSMutableParagraphStyle *paragraphStyle = [[NSMutableParagraphStyle alloc] init];
    paragraphStyle.hyphenationFactor = self.hyphenationFactor;
    paragraphStyle.alignment = self.textAlignment;
    paragraphStyle.minimumLineHeight = self.lineHeight;
    paragraphStyle.maximumLineHeight = self.lineHeight;

    NSDictionary *attributes = @{
        NSParagraphStyleAttributeName: paragraphStyle,
        NSFontAttributeName: self.font ?: [UIFont fontWithName:@"Georgia" size:14],
        NSForegroundColorAttributeName: self.textColor ?: [UIColor blackColor]
    };

    self.attributedText = [[NSAttributedString alloc] initWithString:self.text attributes:attributes];
}

- (void)setText:(NSString *)text {
    _text = text;
    [self updateAttributedText];
}

- (void)setTextColor:(UIColor *)textColor {
    _textColor = textColor;
    [self updateAttributedText];
}

- (void)setFont:(UIFont *)font {
    _font = font;
    [self updateAttributedText];
}

- (void)setHyphenationFactor:(CGFloat)hyphenationFactor {
    _hyphenationFactor = hyphenationFactor;
    [self updateAttributedText];
}

- (void)setLineHeight:(CGFloat)lineHeight {
    _lineHeight = lineHeight;
    [self updateAttributedText];
}

@end

@interface HyphenatedTextManager : RCTViewManager
@end

@implementation HyphenatedTextManager

RCT_EXPORT_MODULE(HyphenatedText)

- (UIView *)view {
    return [[HyphenatedTextView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(text, NSString)
RCT_EXPORT_VIEW_PROPERTY(textColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(hyphenationFactor, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(lineHeight, CGFloat)

RCT_CUSTOM_VIEW_PROPERTY(fontSize, CGFloat, HyphenatedTextView) {
    CGFloat size = json ? [RCTConvert CGFloat:json] : 14;
    view.font = [UIFont fontWithName:@"Georgia" size:size];
}

RCT_CUSTOM_VIEW_PROPERTY(fontFamily, NSString, HyphenatedTextView) {
    NSString *family = json ? [RCTConvert NSString:json] : @"Georgia";
    CGFloat size = view.font.pointSize ?: 14;
    view.font = [UIFont fontWithName:family size:size];
}

@end
