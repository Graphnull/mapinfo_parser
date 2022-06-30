
import { TABMAPHeaderBlock, TABMAPIndexBlock, TABMAPObjectBlock, TABRawBlock, SupportedBlockTypes, TABMAPVertex, TABMAPIndexEntry } from './TABRawBinBlock'


type byte = number
type int = number
export class Stream {
    Position = 0
    Length = 0;
    buf: Uint8Array
    constructor(buf: Uint8Array) {
        this.buf = buf;
        this.Length = buf.length
    }
    Read(out: Uint8Array, offset: number, size: number) {
        let data = this.buf.slice(this.Position, this.Position + size)
        this.Position += size;
        out.set(data, offset)
        return data
    }
}
export class MapFile {
    //public int m_nMinTABVersion = 300;
    //private Collection<mapFileRecord> _records = new Collection<mapFileRecord>();

    header?: TABMAPHeaderBlock;
    index?: TABMAPIndexBlock;
    objects?: TABMAPObjectBlock;

    Open(file: ArrayBuffer): void {

        let stream = new Stream(new Uint8Array(file))
        while (stream.Position < stream.Length) {
            try {
                if (stream.Position == 0) {
                    this.header = new TABMAPHeaderBlock(TABRawBlock.GetBlock(stream));
                }
                else if (stream.Position == TABRawBlock.Size && this.header &&
                    this.header.m_nMAPVersionNumber == TABMAPHeaderBlock.HDR_VERSION_NUMBER) {
                    this.header.Addb(TABRawBlock.GetBlock(stream));
                }
                else {
                    let blk: Uint8Array = TABRawBlock.GetBlock(stream);
                    console.log('stream pos', stream.Position);
                    switch (TABRawBlock.GetBlockClass(blk)) {
                        case SupportedBlockTypes.TABMAP_INDEX_BLOCK:
                            if (this.index)
                                this.index.Addb(blk);
                            else
                                this.index = new TABMAPIndexBlock(blk);

                            break;
                        case SupportedBlockTypes.TABMAP_OBJECT_BLOCK:
                            if (this.objects == null)
                                this.objects = new TABMAPObjectBlock(blk);
                            else
                                this.objects.Addb(blk);
                            break;
                        default:
                            break;
                    }
                }

            }
            catch (err) {
                console.error('parseError', err);
                break;
            }
        }




        //string dbaseFile = fileName.ToLower().Replace(".shp", ".dbf");
        ////dbaseFile = dbaseFile.Replace(".SHP", ".DBF");

        ////!!!
        //this.ReadAttributes(dbaseFile);
    }

    /// <summary>
    /// Returns the appropriate class to convert a shaperecord to an MapAround geometry given the type of shape.
    /// </summary>
    /// <param name="type">The shape file type.</param>
    /// <returns>An instance of the appropriate handler to convert the shape record to a Geometry</returns>
    //internal static ShapeHandler GetShapeHandler(ShapeType type)
    //{
    //    switch (type)
    //    {
    //        case ShapeType.Point:
    //            //case ShapeGeometryType.PointM:
    //            //case ShapeGeometryType.PointZ:
    //            //case ShapeGeometryType.PointZM:
    //            return new MapPointShapeHandler();

    //        //case ShapeType.Polygon:
    //        //    //case ShapeGeometryType.PolygonM:
    //        //    //case ShapeGeometryType.PolygonZ:
    //        //    //case ShapeGeometryType.PolygonZM:
    //        //    return new PolygonHandler();

    //        //case ShapeType.Polyline: //.LineString:
    //        //    //case ShapeGeometryType.LineStringM:
    //        //    //case ShapeGeometryType.LineStringZ:
    //        //    //case ShapeGeometryType.LineStringZM:
    //        //    return new MultiLineHandler();

    //        //case ShapeType.Multipoint:
    //        //    //case ShapeGeometryType.MultiPointM:
    //        //    //case ShapeGeometryType.MultiPointZ:
    //        //    //case ShapeGeometryType.MultiPointZM:
    //        //    return new MultiPointHandler();

    //        default:
    //            string msg = String.Format(System.Globalization.CultureInfo.InvariantCulture, "ShapeType {0} is not supported.", (int)type);
    //            throw new InvalidDataException(msg);
    //    }
    //}


}

/// <summary>
/// Represents a record of shape file.
/// </summary>
export class MapFileRecord {
    ShapeType: byte = 0;

    Symbol: byte = 0;

    MBR: TABMAPIndexEntry = { TAB_MAX_ENTRIES_INDEX_BLOCK: 25, XMin: 0, YMin: 0, XMax: 0, YMax: 0, Id: 0 };

    _contentLength: int = 0;

    _parts: int[] = [];
    _points: TABMAPVertex[] = [];

    _attributes: any;

    CoordBlockPtr: int = 0;

    CoordDataSize: int = 0;

    LabelLocation?: TABMAPVertex;


    /// <summary>
    /// Gets or sets the length (in bytes) of this record.
    /// </summary>
    get ContentLength(): number {
        return this._contentLength;
    }
    set ContentLength(value) {
        this._contentLength = value;
    }

    /// <summary>
    /// Gets a number of parts of the geometry.
    /// </summary>
    get NumberOfParts() {
        return this._parts.length;
    }
    /// <summary>
    /// Gets a number of points of the geometry.
    /// </summary>
    get NumberOfPoints() {
        return this._points.length;
    }

    /// <summary>    
    /// Gets a collection containing the indices of 
    /// coordinate sequences corresponding parts of
    /// geometry.
    /// </summary>
    get Parts() {
        return this._parts;
    }

    /// <summary>
    /// Gets a collection of coordinates of
    /// the geometry.
    /// </summary>

    get Points(): TABMAPVertex[] {
        return this._points;
    }

    /// <summary>
    /// Gets or sets an attributes row associated
    /// with this  record.
    /// </summary>
    get DataRow() {
        return this._attributes;
    }
    set DataRow(value) {
        this._attributes = value;
    }

}
